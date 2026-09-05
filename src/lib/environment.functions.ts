import { createServerFn } from "@tanstack/react-start";

const JAIPUR = { name: "Jaipur, Rajasthan, India", latitude: 26.91, longitude: 75.79 };

export interface AirQualityNow {
  time: string;
  pm25: number | null;
  pm10: number | null;
  uvIndex: number | null;
  dust: number | null;
  ozone: number | null;
  aqi: number | null;
}

export interface SkinTemperaturePoint {
  date: string;
  skinTemperature: number | null;
  airTemperatureMax: number | null;
}

export interface EnvironmentBundle {
  retrievedAt: string;
  air: {
    ok: boolean;
    status: "GOOD" | "OFFLINE";
    message?: string;
    source: string;
    sourceUrl: string;
    now: AirQualityNow | null;
  };
  surface: {
    ok: boolean;
    status: "GOOD" | "OFFLINE";
    message?: string;
    source: string;
    sourceUrl: string;
    series: SkinTemperaturePoint[];
  };
  climatology: {
    ok: boolean;
    status: "GOOD" | "OFFLINE";
    message?: string;
    source: string;
    sourceUrl: string;
    years: number;
    meanTMaxC: number | null;
    hottestTMaxC: number | null;
    hotDaysAbove40PerYear: number | null;
    windowLabel: string;
  };
}

let cache: { at: number; bundle: EnvironmentBundle } | null = null;
const TTL = 30 * 60 * 1000;

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v > -900 ? v : null;
}

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function compact(d: Date) {
  return ymd(d).replaceAll("-", "");
}

export const getJaipurEnvironment = createServerFn({ method: "GET" }).handler(
  async (): Promise<EnvironmentBundle> => {
    const now = Date.now();
    if (cache && now - cache.at < TTL) return cache.bundle;

    const today = new Date();
    const powerEnd = new Date(today.getTime() - 3 * 86_400_000);
    const powerStart = new Date(powerEnd.getTime() - 29 * 86_400_000);

    const airUrl =
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${JAIPUR.latitude}` +
      `&longitude=${JAIPUR.longitude}&current=pm2_5,pm10,uv_index,dust,ozone,european_aqi&timezone=Asia%2FKolkata`;

    const powerUrl =
      `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=TS,T2M_MAX` +
      `&community=RE&longitude=${JAIPUR.longitude}&latitude=${JAIPUR.latitude}` +
      `&start=${compact(powerStart)}&end=${compact(powerEnd)}&format=JSON`;

    const year = today.getUTCFullYear();
    const archiveUrl =
      `https://archive-api.open-meteo.com/v1/archive?latitude=${JAIPUR.latitude}` +
      `&longitude=${JAIPUR.longitude}&start_date=${year - 10}-01-01&end_date=${year - 1}-12-31` +
      `&daily=temperature_2m_max&timezone=Asia%2FKolkata`;

    const [airRes, powerRes, archiveRes] = await Promise.allSettled([
      fetch(airUrl, { headers: { accept: "application/json" } }),
      fetch(powerUrl, { headers: { accept: "application/json" } }),
      fetch(archiveUrl, { headers: { accept: "application/json" } }),
    ]);

    const bundle: EnvironmentBundle = {
      retrievedAt: new Date().toISOString(),
      air: {
        ok: false,
        status: "OFFLINE",
        source: "Open-Meteo Air Quality API (CAMS)",
        sourceUrl: "https://open-meteo.com/en/docs/air-quality-api",
        now: null,
      },
      surface: {
        ok: false,
        status: "OFFLINE",
        source: "NASA POWER daily (MERRA-2 / satellite-derived earth skin temperature)",
        sourceUrl: "https://power.larc.nasa.gov/",
        series: [],
      },
      climatology: {
        ok: false,
        status: "OFFLINE",
        source: "Open-Meteo Historical Weather API (ERA5 reanalysis)",
        sourceUrl: "https://open-meteo.com/en/docs/historical-weather-api",
        years: 10,
        meanTMaxC: null,
        hottestTMaxC: null,
        hotDaysAbove40PerYear: null,
        windowLabel: `${year - 10}–${year - 1}`,
      },
    };

    try {
      if (airRes.status !== "fulfilled" || !airRes.value.ok) throw new Error("air quality request failed");
      const j = (await airRes.value.json()) as Record<string, any>;
      const c = j["current"] ?? {};
      bundle.air.now = {
        time: String(c.time ?? ""),
        pm25: num(c.pm2_5),
        pm10: num(c.pm10),
        uvIndex: num(c.uv_index),
        dust: num(c.dust),
        ozone: num(c.ozone),
        aqi: num(c.european_aqi),
      };
      bundle.air.ok = true;
      bundle.air.status = "GOOD";
    } catch (e) {
      bundle.air.message = e instanceof Error ? e.message : "unavailable";
    }

    try {
      if (powerRes.status !== "fulfilled" || !powerRes.value.ok) throw new Error("NASA POWER request failed");
      const j = (await powerRes.value.json()) as Record<string, any>;
      const params = j?.properties?.parameter ?? {};
      const ts = params.TS ?? {};
      const tmax = params.T2M_MAX ?? {};
      bundle.surface.series = Object.keys(ts)
        .sort()
        .map((k) => ({
          date: `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`,
          skinTemperature: num(ts[k]),
          airTemperatureMax: num(tmax[k]),
        }));
      bundle.surface.ok = bundle.surface.series.length > 0;
      bundle.surface.status = bundle.surface.ok ? "GOOD" : "OFFLINE";
    } catch (e) {
      bundle.surface.message = e instanceof Error ? e.message : "unavailable";
    }

    try {
      if (archiveRes.status !== "fulfilled" || !archiveRes.value.ok)
        throw new Error("historical archive request failed");
      const j = (await archiveRes.value.json()) as Record<string, any>;
      const vals: number[] = (j?.daily?.temperature_2m_max ?? []).filter(
        (v: unknown): v is number => typeof v === "number" && Number.isFinite(v),
      );
      if (vals.length) {
        const hot = vals.filter((v) => v >= 40).length;
        bundle.climatology.meanTMaxC = vals.reduce((a, b) => a + b, 0) / vals.length;
        bundle.climatology.hottestTMaxC = Math.max(...vals);
        bundle.climatology.hotDaysAbove40PerYear = hot / 10;
        bundle.climatology.ok = true;
        bundle.climatology.status = "GOOD";
      }
    } catch (e) {
      bundle.climatology.message = e instanceof Error ? e.message : "unavailable";
    }

    cache = { at: now, bundle };
    return bundle;
  },
);
