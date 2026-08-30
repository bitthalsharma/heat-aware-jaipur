# Jaipur Extreme Heat Early Warning & Human Thermal Stress Index

Team HELIX (118) · SIH26083 · Software · Disaster Management

Ward-level heat-health early warning and decision-support prototype for Jaipur, Rajasthan.
It answers "which areas are at greatest human heat risk, why, how severe, and what should
authorities do" — not just "how hot is it".

## Current status (Phases 1–2 complete)

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | React + TanStack Start UI shell, command-center design system | Done |
| 2 | Real Open-Meteo weather (current, hourly ±7 days, daily), WBGT/UTCI, persistence metrics, data-health + failsafe cache | Done |
| 3 | Jaipur ward GeoJSON import + map | Pending |
| 4–14 | Ward risk engine, vulnerability, satellite LST, alerts, news signal, admin, demo mode | Pending |

Ward-level numbers are intentionally **not shown** until verified ward geometry and
vulnerability datasets are imported. No values are fabricated anywhere.

## Architecture

- `src/lib/weather.functions.ts` — server function calling Open-Meteo once, cached in memory
  (10 min TTL) so every UI component reuses one upstream fetch. Falls back to the last cached
  bundle and reports `DEGRADED`; reports `OFFLINE` with no invented values when no cache exists.
- `src/lib/thermal.ts` — deterministic WBGT, estimated mean radiant temperature and UTCI
  approximation, with methodology strings surfaced in the UI.
- `src/types/weather.ts` — typed data contracts including source/kind/freshness metadata.
- `src/routes/` — `/` dashboard, `/forecast` timeline, `/data-sources`, `/methodology`.
- `src/components/` — `AppShell`, `RiskBadge` (4-level classification), `SourceTag`.

## Data classification

Every figure carries one of: LIVE, HISTORICAL, STATIC, DERIVED, MODEL/ESTIMATED, plus source and
timestamp. Freshness: LIVE (<6 h), RECENT (<24 h), STALE (>24 h), ARCHIVED (static/historical).

## Data sources

- Weather: [Open-Meteo](https://open-meteo.com/) (ECMWF/GFS), lat 26.91 / lon 75.79, Asia/Kolkata.
- Official Indian weather: IMD — integration point defined, not configured.
- Satellite LST: NASA MODIS MOD11A2 — ingestion planned, not configured.
- Ward boundaries, demographics, news: upload/configuration required.

## Environment variables

All secrets stay server-side; none are read in browser code.

```
OPENMETEO_API_URL=https://api.open-meteo.com/v1/forecast   # optional override
IMD_API_KEY=            # future official-source integration
NEWS_API_KEY=           # future public-impact signal
AI_API_KEY=             # future copilot / article classification
```

## Running locally

```bash
bun install
bun run dev     # http://localhost:8080
```

## Limitations

Prototype heat-health risk estimation. No mortality prediction is claimed; thresholds are
prototype values requiring local calibration and validation before operational deployment.
Recommended actions are advisory — final decisions remain with authorized authorities.

## Phase 3 — Ward geometry (complete)

- `/wards` route: Leaflet map on the real Jaipur municipal boundary (OpenStreetMap relation 14277849, ODbL, stored in `src/data/jaipur-boundary.json`).
- Operator import of a verified ward GeoJSON (WGS84 FeatureCollection) with validation, provenance label and browser-local persistence.
- Ward register table with number/name/zone as supplied, plus derived area and centroid.
- No ward polygons are synthesised; ward risk scoring stays disabled until a verified dataset is imported.
