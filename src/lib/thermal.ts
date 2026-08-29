/**
 * Deterministic human thermal-stress calculations.
 *
 * IMPORTANT: every function here returns DERIVED values, not observations.
 * Approximations are documented so the UI can label them honestly.
 */

export interface ThermalInputs {
  /** Air temperature, °C (observed / forecast) */
  temperature: number;
  /** Relative humidity, % */
  humidity: number;
  /** Wind speed at 10 m, km/h */
  windSpeed10m: number;
  /** Shortwave (global) solar radiation, W/m². Optional. */
  solarRadiation?: number | null;
}

export interface ThermalResult {
  wbgt: number;
  utci: number;
  meanRadiantTemperature: number;
  mrtEstimated: boolean;
  heatStressCategory: HeatStressCategory;
  inputs: ThermalInputs;
  methodology: string[];
}

export type HeatStressCategory =
  | "No thermal stress"
  | "Moderate heat stress"
  | "Strong heat stress"
  | "Very strong heat stress"
  | "Extreme heat stress";

/** Water-vapour pressure (hPa) from temperature (°C) and RH (%) — Magnus formula. */
export function vapourPressure(temperature: number, humidity: number): number {
  return (
    (humidity / 100) * 6.105 * Math.exp((17.27 * temperature) / (237.7 + temperature))
  );
}

/** Wind speed at 10 m (km/h) converted to the 10 m value in m/s. */
export function windMs(windSpeed10mKmh: number): number {
  return windSpeed10mKmh / 3.6;
}

/**
 * WBGT (Wet Bulb Globe Temperature), °C.
 *
 * Base term: Australian Bureau of Meteorology simplified WBGT approximation
 * (shade / low-radiation conditions):
 *   WBGT = 0.567 * Ta + 0.393 * e + 3.94
 * A bounded solar-radiation adjustment is added for outdoor (sun-exposed)
 * conditions. This is an ESTIMATE, not a globe-thermometer measurement.
 */
export function calculateWBGT(inputs: ThermalInputs): number {
  const { temperature, humidity, solarRadiation } = inputs;
  const e = vapourPressure(temperature, humidity);
  const base = 0.567 * temperature + 0.393 * e + 3.94;
  const wind = Math.max(0.5, windMs(inputs.windSpeed10m));
  const solar = solarRadiation ?? 0;
  // Bounded radiative uplift: grows with solar load, damped by wind.
  const solarAdjust = Math.min(4, (solar / 1000) * 4) / Math.sqrt(wind);
  return round1(base + Math.min(4, solarAdjust));
}

/**
 * Mean radiant temperature (°C), ESTIMATED from air temperature and global
 * shortwave radiation because direct MRT (globe thermometer) is unavailable.
 */
export function estimateMeanRadiantTemperature(inputs: ThermalInputs): number {
  const solar = inputs.solarRadiation ?? 0;
  const wind = Math.max(0.5, windMs(inputs.windSpeed10m));
  return round1(inputs.temperature + (solar / 60) / Math.sqrt(wind));
}

/**
 * UTCI (Universal Thermal Climate Index), °C — polynomial-style approximation.
 *
 * The full Bröde et al. (2012) UTCI is a 6th-order polynomial with >200 terms.
 * This implementation uses the widely used reduced offset formulation driven by
 * the same four inputs (Ta, MRT delta, wind at 10 m, vapour pressure) and is
 * labelled in the UI as an APPROXIMATION for prototype use.
 */
export function calculateUTCI(inputs: ThermalInputs, mrt: number): number {
  const ta = inputs.temperature;
  const va = Math.min(17, Math.max(0.5, windMs(inputs.windSpeed10m)));
  const dTmrt = mrt - ta;
  const pa = vapourPressure(ta, inputs.humidity) / 10; // kPa

  const offset =
    0.607562052 +
    -0.0227712343 * ta +
    2.06667e-3 * ta * ta +
    -6.16909 * va +
    0.641 * va * va +
    -0.0264 * va * va * va +
    0.0982 * dTmrt +
    1.02e-3 * dTmrt * dTmrt +
    1.58 * pa +
    0.62 * pa * pa +
    0.0521 * ta * pa +
    0.0163 * dTmrt * pa +
    0.158 * va * pa;

  return round1(ta + offset);
}

/** UTCI thermal-stress categories (Bröde et al., 2012 scale). */
export function categorizeUTCI(utci: number): HeatStressCategory {
  if (utci >= 46) return "Extreme heat stress";
  if (utci >= 38) return "Very strong heat stress";
  if (utci >= 32) return "Strong heat stress";
  if (utci >= 26) return "Moderate heat stress";
  return "No thermal stress";
}

export function calculateHeatStress(inputs: ThermalInputs): ThermalResult {
  const mrt = estimateMeanRadiantTemperature(inputs);
  const wbgt = calculateWBGT(inputs);
  const utci = calculateUTCI(inputs, mrt);
  return {
    wbgt,
    utci,
    meanRadiantTemperature: mrt,
    mrtEstimated: true,
    heatStressCategory: categorizeUTCI(utci),
    inputs,
    methodology: [
      "WBGT: BoM simplified approximation (Ta, vapour pressure) plus bounded solar adjustment.",
      "Mean radiant temperature is estimated because direct MRT measurement is unavailable.",
      "UTCI: reduced polynomial approximation of Bröde et al. (2012), prototype use only.",
    ],
  };
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
