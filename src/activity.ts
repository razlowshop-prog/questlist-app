import { ACHIEVEMENTS, TIER_NAMES } from './achievements.ts';
import { frameName, seasonFrameId } from './cosmetics.ts';
import { prizeById, type Rarity } from './wheel.ts';
import {
  addDays,
  CHALLENGE_POOL,
  DEFAULT_MINUTES,
  levelInfo,
  rankFor,
  restDaysOf,
  streakStatus,
  weekStart,
  type GameState,
} from './game.ts';
import type { IconName } from './icons.ts';

// The activity timeline: what the player did, day by day, newest first.
// Friends' activity joins it once accounts exist and they opt in.

export type ActivityEvent =
  | { kind: 'level'; level: number; from: number; rank?: string }
  | { kind: 'challenge'; title: string; icon: IconName; xp: number }
  | { kind: 'achievement'; title: string; tier: string; icon: IconName; xp: number }
  | { kind: 'fire'; change: 'up' | 'down' | 'lost'; tier: number; days: number }
  | { kind: 'token'; token: 'rest' | 'double' | 'adfree' | 'recovery' }
  | { kind: 'season'; frame: string }
  | { kind: 'wheel'; prize: string; rarity: Rarity; xp: number };

export interface ActivityTask {
  title: string;
  /** Times it was done that day. */
  count: number;
  xp: number;
}

export interface ActivityDay {
  date: string;
  /** Tasks done that day, grouped by title, in the order first done. */
  tasks: ActivityTask[];
  taskCount: number;
  minutes: number;
  /** All XP gained that day: tasks plus claimed rewards. */
  xp: number;
  events: ActivityEvent[];
}

/** One line per XP source, so the replay below can find each day's level. */
interface XpItem {
  date: string;
  xp: number;
}

/**
 * Builds the timeline from saved data. Claims saved before claims had a date
 * are placed at the end of their week (challenges) or on the day the player
 * joined (achievements), which is close enough for older data.
 */
export function activityTimeline(state: GameState, today: string): ActivityDay[] {
  const days = new Map<string, ActivityDay>();
  const dayOf = (date: string) => {
    let d = days.get(date);
    if (!d) {
      d = { date, tasks: [], taskCount: 0, minutes: 0, xp: 0, events: [] };
      days.set(date, d);
    }
    return d;
  };
  const items: XpItem[] = [];

  for (const c of state.completions) {
    if (c.date > today) continue;
    const day = dayOf(c.date);
    const title = (c.title ?? state.tasks.find((t) => t.id === c.taskId)?.title ?? 'Task').trim();
    const same = day.tasks.find((t) => t.title.toLowerCase() === title.toLowerCase());
    if (same) {
      same.count++;
      same.xp += c.xp;
    } else day.tasks.push({ title, count: 1, xp: c.xp });
    day.taskCount++;
    day.minutes += c.minutes ?? DEFAULT_MINUTES;
    day.xp += c.xp;
    items.push({ date: c.date, xp: c.xp });
  }

  for (const c of state.claims) {
    const end = addDays(c.week, 6);
    const date = c.date ?? (end < today ? end : today);
    if (date > today) continue;
    const def = CHALLENGE_POOL.find((d) => d.id === c.challengeId);
    const day = dayOf(date);
    day.xp += c.xp;
    day.events.push({ kind: 'challenge', title: def?.title ?? 'Weekly challenge', icon: def?.icon ?? 'Target', xp: c.xp });
    items.push({ date, xp: c.xp });
  }

  for (const c of state.achievementClaims) {
    const date = c.date ?? (state.joinedAt || today);
    if (date > today) continue;
    const def = ACHIEVEMENTS.find((a) => a.id === c.achievementId);
    const day = dayOf(date);
    day.xp += c.xp;
    day.events.push({
      kind: 'achievement',
      title: def?.title ?? 'Achievement',
      tier: TIER_NAMES[c.tier] ?? '',
      icon: def?.icon ?? 'Award',
      xp: c.xp,
    });
    items.push({ date, xp: c.xp });
  }

  for (const s of state.wheelSpins ?? []) {
    if (s.date > today) continue;
    const prize = prizeById(s.prize);
    const day = dayOf(s.date);
    day.xp += s.xp ?? 0;
    day.events.push({ kind: 'wheel', prize: prize?.label ?? 'Prize', rarity: prize?.rarity ?? 'common', xp: s.xp ?? 0 });
    if (s.xp) items.push({ date: s.date, xp: s.xp });
  }

  // Replay the XP day by day to find the days a new level was reached.
  const xpByDay = new Map<string, number>();
  for (const i of items) xpByDay.set(i.date, (xpByDay.get(i.date) ?? 0) + i.xp);
  let total = 0;
  for (const date of [...xpByDay.keys()].sort()) {
    const from = levelInfo(total).level;
    total += xpByDay.get(date)!;
    const level = levelInfo(total).level;
    if (level > from) {
      const rank = rankFor(level);
      // Level ups come first: they are the biggest news of the day.
      dayOf(date).events.unshift({ kind: 'level', level, from, ...(rank !== rankFor(from) && { rank }) });
    }
  }

  for (const d of state.restDays ?? []) if (d <= today) dayOf(d).events.push({ kind: 'token', token: 'rest' });
  if (state.recovery?.used) dayOf(state.recovery.day).events.push({ kind: 'token', token: 'recovery' });
  for (const d of state.doubleDays ?? []) if (d <= today) dayOf(d).events.push({ kind: 'token', token: 'double' });
  for (const d of state.adFreeDays ?? []) if (d <= today) dayOf(d).events.push({ kind: 'token', token: 'adfree' });
  for (const c of state.seasonClaims ?? []) if (c.date <= today) dayOf(c.date).events.push({ kind: 'season', frame: frameName(seasonFrameId(c.month)) });

  for (const h of streakStatus(state.completions, today, restDaysOf(state)).history) {
    dayOf(h.date).events.push({ kind: 'fire', change: h.change, tier: h.tier, days: h.days });
  }

  return [...days.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export interface WeekTotals {
  tasks: number;
  minutes: number;
  xp: number;
  activeDays: number;
}

export interface ActivitySummary {
  thisWeek: WeekTotals;
  /** The same days of last week, so a Wednesday compares with last Mon to Wed. */
  lastWeekSoFar: WeekTotals;
  /** XP per day, Monday to Sunday of this week. */
  week: { date: string; xp: number; future: boolean }[];
}

/** This week at a glance, compared with the same stretch of last week. */
export function activitySummary(state: GameState, today: string): ActivitySummary {
  const monday = weekStart(today);
  const totals = (from: string, to: string): WeekTotals => {
    const inRange = state.completions.filter((c) => c.date >= from && c.date <= to);
    return {
      tasks: inRange.length,
      minutes: inRange.reduce((sum, c) => sum + (c.minutes ?? DEFAULT_MINUTES), 0),
      xp: inRange.reduce((sum, c) => sum + c.xp, 0),
      activeDays: new Set(inRange.map((c) => c.date)).size,
    };
  };
  const lastMonday = addDays(monday, -7);
  const elapsed = Math.round((Date.parse(today) - Date.parse(monday)) / 86400000);
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    return { date, xp: totals(date, date).xp, future: date > today };
  });
  return { thisWeek: totals(monday, today), lastWeekSoFar: totals(lastMonday, addDays(lastMonday, elapsed)), week };
}

/** "Today", "Yesterday", else e.g. "Mon 19 Oct" (with the year when it isn't this year). */
export function activityDayLabel(date: string, today: string): string {
  if (date === today) return 'Today';
  if (date === addDays(today, -1)) return 'Yesterday';
  const [y, m, d] = date.split('-').map(Number);
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(y, m - 1, d, 12).getDay()];
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1];
  return `${weekday} ${d} ${month}${y !== Number(today.slice(0, 4)) ? ` ${y}` : ''}`;
}
