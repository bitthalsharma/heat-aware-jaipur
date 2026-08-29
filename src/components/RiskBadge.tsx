import { AlertTriangle, Flame, ShieldAlert, ThermometerSun } from "lucide-react";

export type RiskLevel = 1 | 2 | 3 | 4;

export const RISK_META: Record<
  RiskLevel,
  { label: string; guidance: string; className: string }
> = {
  1: {
    label: "LOW",
    guidance: "Normal precautions",
    className: "bg-risk-1 text-risk-1-foreground",
  },
  2: {
    label: "MODERATE",
    guidance: "Increase hydration and monitor vulnerable groups",
    className: "bg-risk-2 text-risk-2-foreground",
  },
  3: {
    label: "HIGH",
    guidance: "Prepare cooling centres, hospitals and outdoor-worker advisories",
    className: "bg-risk-3 text-risk-3-foreground",
  },
  4: {
    label: "EXTREME",
    guidance: "Immediate coordinated emergency response",
    className: "bg-risk-4 text-risk-4-foreground",
  },
};

const ICONS = {
  1: ThermometerSun,
  2: AlertTriangle,
  3: ShieldAlert,
  4: Flame,
} as const;

export function RiskBadge({ level, showText = true }: { level: RiskLevel; showText?: boolean }) {
  const meta = RISK_META[level];
  const Icon = ICONS[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-bold tracking-wide ${meta.className}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      LEVEL {level}
      {showText ? ` · ${meta.label}` : null}
    </span>
  );
}
