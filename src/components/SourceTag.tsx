import type { DataKind } from "../types/weather";

const KIND_LABEL: Record<DataKind, string> = {
  LIVE: "Live data",
  HISTORICAL: "Historical data",
  STATIC: "Static dataset",
  DERIVED: "Derived / calculated",
  MODEL: "Model / estimated",
};

export function SourceTag({
  kind,
  source,
  timestamp,
}: {
  kind: DataKind;
  source: string;
  timestamp?: string | null | undefined;
}) {
  return (
    <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
      <span className="font-semibold uppercase tracking-wide">{KIND_LABEL[kind]}</span>
      {" · "}
      {source}
      {timestamp ? ` · ${timestamp}` : ""}
    </p>
  );
}
