import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { AppShell } from "../components/AppShell";
import { formatIST, freshnessOf, weatherQueryOptions } from "../lib/weatherQuery";

export const Route = createFileRoute("/data-sources")({
  head: () => ({
    meta: [
      { title: "Data Sources & Data Health | Jaipur Heat EWS" },
      {
        name: "description",
        content:
          "Every dataset behind the Jaipur heat early warning prototype: source, status, freshness and what is not yet connected.",
      },
      { property: "og:title", content: "Data Sources & Data Health — Jaipur Heat EWS" },
      {
        property: "og:description",
        content:
          "Transparent source, status and freshness for weather, satellite, ward, demographic and news datasets.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(weatherQueryOptions),
  component: DataSourcesPage,
});

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "Connected"
      ? "bg-ok/15 text-ok"
      : status === "Degraded"
        ? "bg-warn/20 text-risk-3-foreground"
        : status === "Unavailable"
          ? "bg-destructive/15 text-destructive"
          : "bg-muted text-muted-foreground";
  return <span className={`rounded px-2 py-0.5 text-xs font-bold ${tone}`}>{status}</span>;
}

function DataSourcesPage() {
  const { data } = useSuspenseQuery(weatherQueryOptions);

  const rows = [
    {
      name: "Weather (primary)",
      provider: "Open-Meteo Forecast API",
      url: "https://open-meteo.com/",
      kind: "Live forecast/observation blend",
      status: data.status === "GOOD" ? "Connected" : data.status === "DEGRADED" ? "Degraded" : "Unavailable",
      updated: formatIST(data.meta.retrievedAt),
      freshness: freshnessOf(data.meta.retrievedAt),
    },
    {
      name: "Official Indian weather",
      provider: "India Meteorological Department (IMD)",
      url: "https://mausam.imd.gov.in/",
      kind: "Official observation / warning",
      status: "Not configured",
      updated: "—",
      freshness: "—",
    },
    {
      name: "Air quality & UV",
      provider: "Open-Meteo Air Quality API (Copernicus CAMS)",
      url: "https://open-meteo.com/en/docs/air-quality-api",
      kind: "Live PM2.5, PM10, ozone, dust, UV index",
      status: "Connected",
      updated: formatIST(data.meta.retrievedAt),
      freshness: "LIVE",
    },
    {
      name: "Surface heat (satellite-derived)",
      provider: "NASA POWER daily — earth skin temperature (MERRA-2)",
      url: "https://power.larc.nasa.gov/",
      kind: "Satellite/reanalysis daily series",
      status: "Connected",
      updated: "Rolling 30 days (3-day latency)",
      freshness: "RECENT",
    },
    {
      name: "Heat climatology",
      provider: "Open-Meteo Historical Weather API (ERA5 reanalysis)",
      url: "https://open-meteo.com/en/docs/historical-weather-api",
      kind: "10-year archive baseline",
      status: "Connected",
      updated: "10-year window",
      freshness: "ARCHIVED",
    },
    {
      name: "Satellite land surface temperature",
      provider: "NASA MODIS MOD11A2 (8-day composite)",
      url: "https://lpdaac.usgs.gov/products/mod11a2v061/",
      kind: "Static composite — not live temperature",
      status: "Not configured",
      updated: "—",
      freshness: "—",
    },
    {
      name: "Ward boundaries",
      provider: "DataMeet Municipal Spatial Data — Jaipur wards (77 wards, CC-BY 4.0)",
      url: "https://github.com/datameet/Municipal_Spatial_Data",
      kind: "Static dataset (bundled; operator file can replace it)",
      status: "Connected (built-in)",
      updated: "30/08/2026",
      freshness: "STATIC",
    },
    {
      name: "City boundary",
      provider: "OpenStreetMap relation 14277849 (ODbL)",
      url: "https://www.openstreetmap.org/relation/14277849",
      kind: "Static municipal outline",
      status: "Connected (built-in)",
      updated: "30/08/2026",
      freshness: "STATIC",
    },
    {
      name: "Demographics / vulnerability",
      provider: "Census or verified municipal dataset",
      url: "",
      kind: "Static dataset (upload required)",
      status: "Not loaded",
      updated: "—",
      freshness: "—",
    },
    {
      name: "Public-impact signal",
      provider: "NewsAPI / public RSS",
      url: "https://newsapi.org/",
      kind: "Supporting evidence only",
      status: "Not configured",
      updated: "—",
      freshness: "—",
    },
    {
      name: "Human thermal stress (WBGT, UTCI)",
      provider: "Server-side deterministic calculation",
      url: "",
      kind: "Derived from live weather inputs",
      status: data.derived ? "Connected" : "Unavailable",
      updated: data.derived ? formatIST(data.derived.calculatedAt) : "—",
      freshness: data.derived ? "LIVE" : "—",
    },
  ];

  return (
    <AppShell>
      <h2 className="font-display text-2xl font-semibold">Data Sources &amp; Data Health</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Nothing in this application is invented. Sources that are not yet connected are shown as
        such rather than filled with placeholder values.
      </p>

      <div className="panel mt-4 overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              {["Dataset", "Provider", "Type", "Status", "Last updated", "Freshness"].map((h) => (
                <th key={h} className="label-caps px-4 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-border/60 last:border-0 align-top">
                <td className="px-4 py-3 font-semibold">{r.name}</td>
                <td className="px-4 py-3">
                  {r.url ? (
                    <a
                      className="text-accent underline underline-offset-2"
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {r.provider}
                    </a>
                  ) : (
                    r.provider
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{r.kind}</td>
                <td className="px-4 py-3">
                  <StatusPill status={r.status} />
                </td>
                <td className="num-md px-4 py-3 text-xs">{r.updated}</td>
                <td className="num-md px-4 py-3 text-xs">{r.freshness}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel mt-4 p-4">
        <h3 className="text-lg font-semibold">Freshness definitions</h3>
        <ul className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
          <li>LIVE — retrieved less than 6 hours ago</li>
          <li>RECENT — retrieved less than 24 hours ago</li>
          <li>STALE — older than 24 hours</li>
          <li>ARCHIVED — historical or static dataset by design</li>
        </ul>
      </div>

      <div className="panel mt-4 p-4">
        <h3 className="text-lg font-semibold">Failsafe behaviour</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          If Open-Meteo fails, the system attempts the configured official provider, then falls back
          to the last cached retrieval and marks itself <strong>DEGRADED — cached weather</strong>.
          If no cached value exists, the interface shows <strong>Data unavailable</strong> instead of
          a substituted number.
        </p>
      </div>
    </AppShell>
  );
}
