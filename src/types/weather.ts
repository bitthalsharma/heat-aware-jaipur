export type DataKind = "LIVE" | "HISTORICAL" | "STATIC" | "DERIVED" | "MODEL";

export type Freshness = "LIVE" | "RECENT" | "STALE" | "ARCHIVED";

export type DataHealth = "GOOD" | "DEGRADED" | "OFFLINE";

export interface SourceMeta {
  source: string;
  sourceUrl: string;
  kind: DataKind;
  retrievedAt: string;
  location: { name: string; latitude: number; longitude: number };
}

export interface CurrentConditions {
  time: string;
  temperature2m: number | null;
  relativeHumidity2m: number | null;
  dewPoint2m: number | null;
  apparentTemperature: number | null;
  windSpeed10m: number | null;
  windDirection10m: number | null;
  windGusts10m: number | null;
  precipitation: number | null;
  cloudCover: number | null;
  surfacePressure: number | null;
  shortwaveRadiation: number | null;
  directRadiation: number | null;
  directNormalIrradiance: number | null;
  weatherCode: number | null;
  isDay: number | null;
}

export interface HourlyPoint {
  time: string;
  temperature: number | null;
  humidity: number | null;
  windSpeed: number | null;
  shortwaveRadiation: number | null;
  wbgt: number | null;
  utci: number | null;
}

export interface DailyPoint {
  date: string;
  tMax: number | null;
  tMin: number | null;
  peakWbgt: number | null;
  peakUtci: number | null;
  sunshineDuration: number | null;
}

export interface WeatherUnits {
  [key: string]: string;
}

export interface WeatherBundle {
  ok: boolean;
  status: DataHealth;
  message?: string;
  meta: SourceMeta;
  current: CurrentConditions | null;
  units: WeatherUnits;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
  derived: {
    wbgt: number | null;
    utci: number | null;
    meanRadiantTemperature: number | null;
    heatStressCategory: string | null;
    mrtEstimated: boolean;
    calculatedAt: string;
    methodology: string[];
  } | null;
  persistence: {
    consecutiveHotHours: number;
    nighttimeMinTemperature: number | null;
    forecastPeakTemperature: number | null;
    heatwaveDurationDays: number;
    hotDayThresholdC: number;
    hotNightThresholdC: number;
  } | null;
}
