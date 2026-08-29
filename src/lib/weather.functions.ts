import { createServerFn } from "@tanstack/react-start";

import { calculateHeatStress } from "./thermal";
import type {
  CurrentConditions,
  DailyPoint,
  HourlyPoint,
  WeatherBundle,
} from "../types/weather";

const JAIPUR = { name: "Jaipur, Rajasthan, India", latitude: 26.91, longitude: 75.79 };

const HOT_DAY_THRESHOLD_C = 40;
const HOT_NIGHT_THRESHOLD_C = 28;

const CURRENT_VARS = [
  "temperature_2m",
  "relative_humidity_2m",
  "dew_point_2m",
  "apparent_temperature",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "precipitation",
  "cloud_cover",
  "surface_pressure",
  "shortwave_radiation",
  "direct_radiation",
  "direct_normal_irradiance",
  "weather_code",
  "is_day",
].join(",");

const HOURLY_VARS = [
  "temperature_2m",
  "relative_humidity_2m",
  "dew_point_2m",
  "apparent_temperature",
  "wind_speed_10m",
  "shortwave_radiation",
  "precipitation",
  "cloud_cover",
  "is_day",
].join(",");

const DAILY_VARS = [
  "temperature_2m_max",
  "temperature_2m_min",
  "sunshine_duration",
  "weather_code",
].join(",");

/** In-memory cache so the whole dashboard uses ONE upstream fetch. */
let cache: { at: number; bundle: WeatherBundle } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000;

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export const getJaipurWeather = createServerFn({ method: "GET" }).handler(
  async (): Promise<WeatherBundle> => {
    const now = Date.now();
    if (cache && now - cache.at < CACHE_TTL_MS) return cache.bundle;

    const base = process.env["OPENMETEO_API_URL"] ?? "https://api.open-meteo.com/v1/forecast";
    const url =
      `${base}?latitude=${JAIPUR.latitude}&longitude=${JAIPUR.longitude}` +
      `&current=${CURRENT_VARS}&hourly=${HOURLY_VARS}&daily=${DAILY_VARS}` +
      `&timezone=Asia%2FKolkata&past_days=7&forecast_days=7`;

    const meta = {
      source: "Open-Meteo Forecast API (ECMWF / GFS blend)",
      sourceUrl: "https://open-meteo.com/",
      kind: "LIVE" as const,
      retrievedAt: new Date().toISOString(),
      location: JAIPUR,
    };

    try {
      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(`Open-Meteo responded ${res.status}`);
      const json = (await res.json()) as Record<string, any>;

      const c = json["current"] ?? {};
      const current: CurrentConditions = {
        time: String(c.time ?? ""),
        temperature2m: num(c.temperature_2m),
        relativeHumidity2m: num(c.relative_humidity_2m),
        dewPoint2m: num(c.dew_point_2m),
        apparentTemperature: num(c.apparent_temperature),
        windSpeed10m: num(c.wind_speed_10m),
        windDirection10m: num(c.wind_direction_10m),
        windGusts10m: num(c.wind_gusts_10m),
        precipitation: num(c.precipitation),
        cloudCover: num(c.cloud_cover),
        surfacePressure: num(c.surface_pressure),
        shortwaveRadiation: num(c.shortwave_radiation),
        directRadiation: num(c.direct_radiation),
        directNormalIrradiance: num(c.direct_normal_irradiance),
        weatherCode: num(c.weather_code),
        isDay: num(c.is_day),
      };

      const h = json["hourly"] ?? {};
      const times: string[] = h.time ?? [];
      const hourly: HourlyPoint[] = times.map((t: string, i: number) => {
        const temperature = num(h.temperature_2m?.[i]);
        const humidity = num(h.relative_humidity_2m?.[i]);
        const windSpeed = num(h.wind_speed_10m?.[i]);
        const rad = num(h.shortwave_radiation?.[i]);
        let wbgt: number | null = null;
        let utci: number | null = null;
        if (temperature !== null && humidity !== null && windSpeed !== null) {
          const r = calculateHeatStress({
            temperature,
            humidity,
            windSpeed10m: windSpeed,
            solarRadiation: rad,
          });
          wbgt = r.wbgt;
          utci = r.utci;
        }
        return { time: t, temperature, humidity, windSpeed, shortwaveRadiation: rad, wbgt, utci };
      });

      const d = json["daily"] ?? {};
      const dates: string[] = d.time ?? [];
      const daily: DailyPoint[] = dates.map((date: string, i: number) => {
        const dayHours = hourly.filter((p) => p.time.startsWith(date));
        const peak = (key: "wbgt" | "utci") => {
          const vals = dayHours.map((p) => p[key]).filter((v): v is number => v !== null);
          return vals.length ? Math.max(...vals) : null;
        };
        return {
          date,
          tMax: num(d.temperature_2m_max?.[i]),
          tMin: num(d.temperature_2m_min?.[i]),
          peakWbgt: peak("wbgt"),
          peakUtci: peak("utci"),
          sunshineDuration: num(d.sunshine_duration?.[i]),
        };
      });

      const derivedNow =
        current.temperature2m !== null &&
        current.relativeHumidity2m !== null &&
        current.windSpeed10m !== null
          ? calculateHeatStress({
              temperature: current.temperature2m,
              humidity: current.relativeHumidity2m,
              windSpeed10m: current.windSpeed10m,
              solarRadiation: current.shortwaveRadiation,
            })
          : null;

      const todayIso = new Date().toISOString().slice(0, 10);
      const futureDaily = daily.filter((p) => p.date >= todayIso);
      const forecastPeak = futureDaily
        .map((p) => p.tMax)
        .filter((v): v is number => v !== null);

      // Consecutive future days above the hot-day threshold, starting today.
      let heatwaveDurationDays = 0;
      for (const p of futureDaily) {
        if (p.tMax !== null && p.tMax >= HOT_DAY_THRESHOLD_C) heatwaveDurationDays += 1;
        else break;
      }

      // Consecutive most-recent hours at/above threshold, up to "now".
      const nowIdx = hourly.findIndex((p) => p.time >= (current.time || ""));
      const upto = nowIdx === -1 ? hourly.length : nowIdx + 1;
      let consecutiveHotHours = 0;
      for (let i = upto - 1; i >= 0; i--) {
        const t = hourly[i]?.temperature;
        if (t !== null && t !== undefined && t >= HOT_DAY_THRESHOLD_C) consecutiveHotHours += 1;
        else break;
      }

      const lastNight = hourly
        .slice(Math.max(0, upto - 24), upto)
        .filter((p) => p.temperature !== null)
        .map((p) => p.temperature as number);

      const bundle: WeatherBundle = {
        ok: true,
        status: "GOOD",
        meta,
        current,
        units: (json["current_units"] ?? {}) as Record<string, string>,
        hourly,
        daily,
        derived: derivedNow
          ? {
              wbgt: derivedNow.wbgt,
              utci: derivedNow.utci,
              meanRadiantTemperature: derivedNow.meanRadiantTemperature,
              heatStressCategory: derivedNow.heatStressCategory,
              mrtEstimated: true,
              calculatedAt: new Date().toISOString(),
              methodology: derivedNow.methodology,
            }
          : null,
        persistence: {
          consecutiveHotHours,
          nighttimeMinTemperature: lastNight.length ? Math.min(...lastNight) : null,
          forecastPeakTemperature: forecastPeak.length ? Math.max(...forecastPeak) : null,
          heatwaveDurationDays,
          hotDayThresholdC: HOT_DAY_THRESHOLD_C,
          hotNightThresholdC: HOT_NIGHT_THRESHOLD_C,
        },
      };

      cache = { at: now, bundle };
      return bundle;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown network error";
      if (cache) {
        return {
          ...cache.bundle,
          status: "DEGRADED",
          message: `Live fetch failed (${message}). Showing last cached retrieval.`,
        };
      }
      return {
        ok: false,
        status: "OFFLINE",
        message: `Weather source unavailable: ${message}. No cached value exists yet.`,
        meta,
        current: null,
        units: {},
        hourly: [],
        daily: [],
        derived: null,
        persistence: null,
      };
    }
  },
);
