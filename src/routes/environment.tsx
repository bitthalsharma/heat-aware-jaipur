import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { AppShell } from "../components/AppShell";
import { SourceTag } from "../components/SourceTag";
import { environmentQueryOptions } from "../lib/environmentQuery";
import { fmt, formatIST } from "../lib/weatherQuery";

export const Route = createFileRoute("/environment")({
  head: () => ({
    meta: [
      { title: "Air Quality, Surface Heat & Climatology | Jaipur Heat EWS" },
      {
        name: "description",
        content:
          "Live Jaipur air quality (PM2.5, PM10, UV, dust), NASA satellite-derived earth skin temperature and ten-year heat climatology from ERA5 reanalysis.",
      },
      { property: "og:title", content: "Air Quality, Surface Heat & Climatology — Jaipur" },
      {
        property: "og:description",
        content:
          "Additional live and archival environmental feeds behind the Jaipur heat early warning prototype.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(environmentQueryOptions),
  component: EnvironmentPage,
});

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border/70 p-3">
      <p className="label-caps">{label}</p>
      <p className="num-md mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function EnvironmentPage() {
  const { data } = useSuspenseQuery(environmentQueryOptions);
  const air = data.air.now;
  const surface = data.surface.series.slice(-10).reverse();

  return (
    <AppShell>
      <h2 className="font-display text-2xl font-semibold">Air Quality, Surface Heat &amp; Climatology</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Additional live and archival feeds that modulate human heat risk. Every panel names its
        provider; unavailable feeds are shown as unavailable rather than filled with substitutes.
      </p>

      <div className="panel mt-4 p-4">
        <h3 className="text-lg font-semibold">Live air quality &amp; UV</h3>
        {air ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="PM2.5 µg/m³" value={fmt(air.pm25)} />
            <Stat label="PM10 µg/m³" value={fmt(air.pm10)} />
            <Stat label="European AQI" value={fmt(air.aqi, "", 0)} />
            <Stat label="UV index" value={fmt(air.uvIndex)} />
            <Stat label="Dust µg/m³" value={fmt(air.dust)} />
            <Stat label="Ozone µg/m³" value={fmt(air.ozone, "", 0)} />
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Data unavailable — {data.air.message ?? "source could not be reached"}.
          </p>
        )}
        <SourceTag kind="LIVE" source={data.air.source} timestamp={formatIST(data.retrievedAt)} />
      </div>

      <div className="panel mt-4 p-4">
        <h3 className="text-lg font-semibold">Satellite-derived surface heat (last 30 days)</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Earth skin temperature is a surface measure and is normally hotter than air temperature —
          it indicates urban surface heat load, not what a thermometer in shade reads.
        </p>
        {surface.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {["Date", "Skin temp °C", "Air max °C", "Surface excess °C"].map((h) => (
                    <th key={h} className="label-caps px-3 py-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {surface.map((r) => (
                  <tr key={r.date} className="border-b border-border/60 last:border-0">
                    <td className="num-md px-3 py-2">{r.date}</td>
                    <td className="num-md px-3 py-2">{fmt(r.skinTemperature)}</td>
                    <td className="num-md px-3 py-2">{fmt(r.airTemperatureMax)}</td>
                    <td className="num-md px-3 py-2">
                      {r.skinTemperature !== null && r.airTemperatureMax !== null
                        ? fmt(r.skinTemperature - r.airTemperatureMax)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Data unavailable — {data.surface.message ?? "source could not be reached"}.
          </p>
        )}
        <SourceTag
          kind="HISTORICAL"
          source={data.surface.source}
          timestamp={formatIST(data.retrievedAt)}
        />
      </div>

      <div className="panel mt-4 p-4">
        <h3 className="text-lg font-semibold">
          Ten-year heat climatology ({data.climatology.windowLabel})
        </h3>
        {data.climatology.ok ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Stat label="Mean daily max °C" value={fmt(data.climatology.meanTMaxC)} />
            <Stat label="Hottest recorded max °C" value={fmt(data.climatology.hottestTMaxC)} />
            <Stat
              label="Days ≥ 40 °C per year"
              value={fmt(data.climatology.hotDaysAbove40PerYear)}
            />
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Data unavailable — {data.climatology.message ?? "source could not be reached"}.
          </p>
        )}
        <SourceTag
          kind="HISTORICAL"
          source={data.climatology.source}
          timestamp={formatIST(data.retrievedAt)}
        />
      </div>
    </AppShell>
  );
}
