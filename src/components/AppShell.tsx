import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/forecast", label: "Forecast" },
  { to: "/wards", label: "Wards" },
  { to: "/data-sources", label: "Data Sources" },
  { to: "/methodology", label: "Methodology" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/60">
              Team HELIX · 118 · SIH26083 · Disaster Management
            </p>
            <h1 className="font-display text-xl font-semibold sm:text-2xl">
              Jaipur Extreme Heat Early Warning System
            </h1>
            <p className="text-xs text-primary-foreground/70">
              Human-centred, ward-level heat risk intelligence for disaster preparedness
            </p>
          </div>
          <nav className="flex flex-wrap gap-1" aria-label="Main">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="rounded px-3 py-1.5 text-sm font-medium text-primary-foreground/75 transition-colors hover:bg-white/10"
                activeProps={{ className: "bg-white/15 text-primary-foreground" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
      <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground sm:px-6">
        Prototype decision-support system. Requires local calibration and validation before
        operational deployment. Final operational decisions remain with authorized authorities.
      </footer>
    </div>
  );
}
