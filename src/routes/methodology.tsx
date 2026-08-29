import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "../components/AppShell";

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
      { title: "Methodology & Explainability | Jaipur Heat EWS" },
      {
        name: "description",
        content:
          "How the Jaipur heat-health risk prototype works: why temperature alone is insufficient, how WBGT and UTCI are computed, and current limitations.",
      },
      { property: "og:title", content: "Methodology & Explainability — Jaipur Heat EWS" },
      {
        property: "og:description",
        content:
          "Transparent explanation of heat-stress calculation, ward risk scoring design and prototype limitations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MethodologyPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel mt-4 p-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="mt-2 space-y-2 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

function MethodologyPage() {
  return (
    <AppShell>
      <h2 className="font-display text-2xl font-semibold">Methodology &amp; Explainability</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        This is a heat-health risk estimation and decision-support prototype. It does not predict
        mortality and requires local calibration and validation before operational deployment.
      </p>

      <Section title="Why air temperature alone is insufficient">
        <p>
          Two places at the same air temperature can pose very different danger to people. Humidity
          limits sweat evaporation, wind removes heat, sunlight adds radiant load, and warm nights
          prevent recovery. Human risk also depends on who lives there and how they work.
        </p>
      </Section>

      <Section title="How human heat stress is calculated (implemented)">
        <p>
          <strong>WBGT</strong> uses the Bureau of Meteorology simplified formulation
          <code className="mx-1 rounded bg-muted px-1">0.567·Ta + 0.393·e + 3.94</code>
          where <em>e</em> is vapour pressure from temperature and relative humidity, plus a bounded
          solar-radiation adjustment damped by wind speed.
        </p>
        <p>
          <strong>UTCI</strong> uses a reduced polynomial approximation of Bröde et al. (2012),
          driven by air temperature, mean radiant temperature difference, wind speed at 10 m and
          vapour pressure. Categories follow the published UTCI stress scale.
        </p>
        <p>
          <strong>Mean radiant temperature is estimated</strong> from global shortwave radiation and
          wind because direct MRT measurement is unavailable. It is labelled as an estimate
          everywhere it appears.
        </p>
      </Section>

      <Section title="Risk engine design (Phase 5, not yet active)">
        <p>
          Risk Score = Weather Exposure + Thermal Stress + Persistence + Vulnerability + Public
          Impact, each normalised to 0–100 and combined with configurable weights (defaults 0.25 /
          0.25 / 0.15 / 0.25 / 0.10). The public-impact signal is capped (default 10%) and can never
          raise a ward on the strength of a single article.
        </p>
        <p>
          Ward-level results are not shown yet because verified ward geometry and vulnerability data
          have not been imported. Fabricating them would violate the project&apos;s data rules.
        </p>
      </Section>

      <Section title="Data classification rules">
        <ul className="list-disc space-y-1 pl-5">
          <li>Live data — retrieved now from a provider, with timestamp and source.</li>
          <li>Historical data — archive/reanalysis, never called a station observation.</li>
          <li>Static dataset — uploaded and verified (ward geometry, demographics, satellite).</li>
          <li>Derived — computed deterministically from stated inputs.</li>
          <li>Model / estimated — approximation, always labelled as such.</li>
        </ul>
      </Section>

      <Section title="Limitations">
        <ul className="list-disc space-y-1 pl-5">
          <li>No validated local health-outcome data; no mortality prediction is claimed.</li>
          <li>Vulnerability indicators are proxies, not exact measures of individual risk.</li>
          <li>Satellite land surface temperature is a slow composite, not current air temperature.</li>
          <li>Thresholds are prototype values requiring local calibration.</li>
        </ul>
      </Section>

      <Section title="Scientific references informing the design">
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Personalized heat stress early warning system for an urban area — Kshitij Kacker, Piyush
            Srivastava.
          </li>
          <li>
            Excess Mortality Risk Due to Heat Stress in Different Climatic Zones of India — Rohit
            Kumar Choudhary, Pallavi Joshi.
          </li>
          <li>
            A framework for impact based heat stress warning system for a coastal city in India —
            Kshitij Kacker, Abhinav Utpal, Shiwam Singh, Piyush Srivastava.
          </li>
        </ol>
        <p>
          No numerical coefficients from these works are embedded in the application. Any future
          coefficients will be stored in a configurable research-parameters table with full citation.
        </p>
      </Section>
    </AppShell>
  );
}
