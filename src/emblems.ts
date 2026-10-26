import { CATEGORIES, taskCategory } from './library.ts';
import type { GameState } from './game.ts';
import type { IconName } from './icons.ts';
import { N } from './i18n.ts';

// Category emblems: finish enough tasks of one kind (fitness, home, …) and
// its emblem appears on the profile, in bronze, then silver, then gold.

export const EMBLEM_TIERS = [
  { name: N('Bronze'), goal: 25 },
  { name: N('Silver'), goal: 100 },
  { name: N('Gold'), goal: 250 },
];

export interface EmblemStatus {
  category: string;
  label: string;
  icon: IconName;
  done: number;
  /** Tiers reached: 0 = none yet, 3 = gold. */
  tier: number;
  /** The goal of the next tier, undefined once gold. */
  next?: number;
}

/** Tasks done per category. Completions keep their title, so deleted tasks still count. */
export function categoryCounts(state: Pick<GameState, 'completions' | 'tasks'>, from = '', to = '9999'): Map<string, number> {
  const tasks = new Map(state.tasks.map((t) => [t.id, t]));
  const byTitle = new Map<string, string>();
  const counts = new Map<string, number>();
  for (const c of state.completions) {
    if (c.date < from || c.date > to) continue;
    const task = tasks.get(c.taskId);
    const title = c.title ?? task?.title ?? '';
    const key = `${title.toLowerCase()}|${task?.category ?? ''}`;
    let category = byTitle.get(key);
    if (category === undefined) {
      category = taskCategory({ title, category: task?.category });
      byTitle.set(key, category);
    }
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return counts;
}

/** Every category's emblem, earned ones first (gold before silver before bronze), then the closest to earning. */
export function emblemStatuses(state: Pick<GameState, 'completions' | 'tasks'>): EmblemStatus[] {
  const counts = categoryCounts(state);
  return CATEGORIES.map((cat) => {
    const done = counts.get(cat.id) ?? 0;
    const tier = EMBLEM_TIERS.filter((t) => done >= t.goal).length;
    return { category: cat.id, label: cat.label, icon: cat.icon, done, tier, next: EMBLEM_TIERS[tier]?.goal };
  }).sort((a, b) => b.tier - a.tier || b.done - a.done);
}
