import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "../components/AppShell";
import { fmt, formatIST, weatherQueryOptions } from "../lib/weatherQuery";

export const Route = createFileRoute("/forecast")({
  head: () => ({
    meta: [
      { title: "Heatwave Timeline & Forecast Risk | Jaipur Heat EWS" },
      {
        name: "description",
        content:
          "Seven days past and seven days ahead of air temperature, WBGT and UTCI for Jaipur, with night-time heat persistence highlighted.",
      },
      { property: "og:title", content: "Heatwave Timeline & Forecast Risk — Jaipur" },
      {
        property: "og:description",
        content:
          "Past and forecast air temperature with derived WBGT and UTCI human thermal stress for Jaipur.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(weatherQueryOptions),
  component: ForecastPage,
});

function ForecastPage() {
  const { data } = useSuspenseQuery(weatherQueryOptions);
  const todayIso = new Date().toISOString().slice(0, 10);

  const series = data.hourly
    .filter((_, i) => i % 3 === 0)
    .map((p) => ({
      label: p.time.replace("T", " ").slice(5, 13),
      time: p.time,
      Temperature: p.temperature,
      WBGT: p.wbgt,
      UTCI: p.utci,
    }));

  return (
    <AppShell>
      <h2 className="font-display text-2xl font-semibold">Forecast &amp; Heatwave Timeline</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Past 7 days and next 7 days. Air temperature is an observation/forecast from Open-Meteo;
        WBGT and UTCI are derived on the server from those inputs and are labelled as calculated
        values, not measurements.
      </p>

      <div className="panel mt-4 p-4">
        <h3 className="text-lg font-semibold">Temperature vs human heat stress</h3>
        <p className="label-caps mt-1">
          Live + model forecast · Open-Meteo · retrieved {formatIST(data.meta.retrievedAt)}
        </p>
        <div className="mt-4 h-[340px] w-full">
          <ClientOnly fallback={<div className="h-full w-full animate-pulse rounded bg-muted" />}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={28} />
                <YAxis tick={{ fontSize: 10 }} unit="°" />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <ReferenceLine
                  y={40}
                  stroke="var(--color-risk-3)"
                  strokeDasharray="4 4"
                  label={{ value: "Hot-day threshold 40°C", fontSize: 10, position: "right" }}
                />
                <Line
                  dataKey="Temperature"
                  stroke="var(--color-primary)"
                  dot={false}
                  strokeWidth={2}
                />
                <Line dataKey="WBGT" stroke="var(--color-risk-3)" dot={false} strokeWidth={2} />
                <Line dataKey="UTCI" stroke="var(--color-risk-4)" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ClientOnly>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Sampled every 3 hours for readability. WBGT/UTCI: derived values — see Methodology.
        </p>
      </div>

      <div className="panel mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <caption className="px-4 pt-4 text-left text-lg font-semibold">Daily summary</caption>
          <thead>
            <tr className="border-b border-border text-left">
              {["Date", "Max °C", "Min °C", "Peak WBGT", "Peak UTCI", "Type"].map((h) => (
                <th key={h} className="label-caps px-4 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.daily.map((row) => (
              <tr key={row.date} className="border-b border-border/60 last:border-0">
                <td className="num-md px-4 py-2">{row.date}</td>
                <td className="num-md px-4 py-2">{fmt(row.tMax, "")}</td>
                <td className="num-md px-4 py-2">{fmt(row.tMin, "")}</td>
                <td className="num-md px-4 py-2">{fmt(row.peakWbgt, "")}</td>
                <td className="num-md px-4 py-2">{fmt(row.peakUtci, "")}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">
                  {row.date < todayIso ? "Past (model reanalysis/forecast archive)" : "Forecast"}
                </td>
              </tr>
            ))}
            {data.daily.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Data unavailable — weather source could not be reached.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <p className="px-4 pb-4 pt-2 text-[11px] text-muted-foreground">
          Past days come from the Open-Meteo forecast archive, not direct station observations.
        </p>
      </div>
    </AppShell>
  );
}
