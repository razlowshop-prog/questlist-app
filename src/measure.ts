// Walk, Run and Steps: library tasks the player sizes themselves, by time or
// distance (steps by count). The amount lives in the title ("Walk 3 km",
// "Run 30 min", "Walk 4,000 steps"), so the time estimate (estimate.ts)
// turns it into minutes and XP like any other title, with the same caps.

export type Measure = 'walk' | 'run' | 'steps';
export type MeasureUnit = 'min' | 'km' | 'steps';

export interface Amount {
  unit: MeasureUnit;
  value: number;
}

interface Range {
  min: number;
  max: number;
  step: number;
}

/** What each one can be set to. The tops match the time caps in estimate.ts (150 min walking or running, 200 min of steps). */
export const MEASURE_RANGES: Record<Measure, Partial<Record<MeasureUnit, Range>>> = {
  walk: { min: { min: 5, max: 150, step: 5 }, km: { min: 0.5, max: 12.5, step: 0.5 } },
  run: { min: { min: 5, max: 150, step: 5 }, km: { min: 1, max: 25, step: 0.5 } },
  steps: { steps: { min: 1000, max: 20000, step: 500 } },
};

/** Where switching to time or distance starts. */
export const UNIT_STARTS: Record<Measure, Partial<Record<MeasureUnit, number>>> = {
  walk: { min: 30, km: 3 },
  run: { min: 30, km: 5 },
  steps: { steps: 4000 },
};

/** Where a new one starts: half an hour, or 4,000 steps. */
export const DEFAULT_AMOUNTS: Record<Measure, Amount> = {
  walk: { unit: 'min', value: 30 },
  run: { unit: 'min', value: 30 },
  steps: { unit: 'steps', value: 4000 },
};

/** "4,000", whatever the phone's language. */
export function thousands(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** "2.5" or "3": no trailing zeros. */
function kmLabel(km: number): string {
  return String(Math.round(km * 10) / 10);
}

export function amountLabel(amount: Amount): string {
  if (amount.unit === 'km') return `${kmLabel(amount.value)} km`;
  if (amount.unit === 'steps') return `${thousands(amount.value)} steps`;
  return `${amount.value} min`;
}

export function measuredTitle(measure: Measure, amount: Amount): string {
  return `${measure === 'run' ? 'Run' : 'Walk'} ${amountLabel(amount)}`;
}

/** Minutes per km walking and running, and steps per minute. */
export const PACE = { walk: 12, run: 6, stepsPerMinute: 100 };

/** Raw minutes for an amount, before estimate.ts rounds and caps it. */
export function measuredMinutes(measure: Measure, amount: Amount): number {
  if (amount.unit === 'steps') return amount.value / PACE.stepsPerMinute;
  if (amount.unit === 'km') return amount.value * (measure === 'run' ? PACE.run : PACE.walk);
  return amount.value;
}

/** Keeps an amount inside its range, on a whole step. */
export function clampAmount(measure: Measure, amount: Amount): Amount {
  const range = MEASURE_RANGES[measure][amount.unit];
  if (!range) return DEFAULT_AMOUNTS[measure];
  const stepped = Math.round(amount.value / range.step) * range.step;
  return { unit: amount.unit, value: Math.min(range.max, Math.max(range.min, Math.round(stepped * 10) / 10)) };
}

/** The measure and amount in a title like "Walk 3 km", if it is one. */
export function parseMeasured(title: string): { measure: Measure; amount: Amount } | undefined {
  const t = title.trim().toLowerCase().replace(/\s+/g, ' ');
  const steps = t.match(/^walk (\d{1,3}(?:,\d{3})+|\d+) steps$/);
  if (steps) return { measure: 'steps', amount: { unit: 'steps', value: Number(steps[1].replace(/,/g, '')) } };
  const m = t.match(/^(walk|run) (\d+(?:\.\d+)?) (min|km)$/);
  if (!m) return undefined;
  return { measure: m[1] as Measure, amount: { unit: m[3] as MeasureUnit, value: Number(m[2]) } };
}

/**
 * Steps on the way for a longer walk or run: thirds up to an hour and a half,
 * quarters beyond, each a distance, time or step count. Shorter ones have none.
 */
export function measuredSteps(amount: Amount, minutes: number): string[] {
  if (minutes < 30) return [];
  const parts = minutes <= 90 ? 3 : 4;
  const unit = amount.unit === 'km' ? 0.5 : amount.unit === 'steps' ? 500 : 5;
  const marks: number[] = [];
  for (let i = 1; i < parts; i++) {
    const mark = Math.round((amount.value * i) / parts / unit) * unit;
    if (mark > (marks.at(-1) ?? 0) && mark < amount.value) marks.push(Math.round(mark * 10) / 10);
  }
  return [...marks, amount.value].map((value) => amountLabel({ unit: amount.unit, value }));
}
