import { Crown, FerrisWheel, ListChecks, Sparkles } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView,  Text, View } from 'react-native';
import { activityDayLabel, activitySummary, activityTimeline, type ActivityDay, type ActivityEvent, type WeekTotals } from '../activity';
import { AppIcon } from '../components/AppIcon';
import { Fire, fireColor } from '../components/Fire';
import { TOKEN_ICONS } from '../components/RewardPicture';
import { durationLabel, streakTierName, type GameState } from '../game';
import { card, eyebrow, FONTS, themed, useStyles, useTheme } from '../theme';
import { fill, GradientText, VIVID_HEAVY } from '../components/Vivid';
import { BRAND } from '../vivid';

/** Days shown before "Show older"; each tap adds this many more. */
const PAGE = 10;
/** Task titles shown per day before "+N more". */
const TASKS_SHOWN = 4;

/**
 * The activity feed, opened from the bell: each day's tasks, level ups,
 * claimed rewards and fire changes, newest first. Friends' activity joins it
 * once accounts arrive.
 */
export function ActivityScreen({ state, today }: { state: GameState; today: string }) {
  const s = useStyles(makeStyles);
  const [shown, setShown] = useState(PAGE);
  const days = useMemo(() => activityTimeline(state, today), [state, today]);

  return (
    <ScrollView contentContainerStyle={s.content}>
      <Text style={s.intro}>Your finished tasks, level ups and rewards. Friends' streaks and level ups join here once accounts arrive.</Text>
      {days.length === 0 ? (
        <Text style={s.empty}>Nothing here yet. Finish your first task and it shows up here.</Text>
      ) : (
        days.slice(0, shown).map((d) => <DayCard key={d.date} day={d} today={today} />)
      )}
      {days.length > shown && (
        <Pressable onPress={() => setShown(shown + PAGE)} style={s.more} accessibilityRole="button">
          <Text style={s.moreText}>Show older</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

/** This week's tasks, time and XP against the same days last week, and XP per day as bars. */
export function WeekCard({ summary, today }: { summary: ReturnType<typeof activitySummary>; today: string }) {
  const s = useStyles(makeStyles);
  const { thisWeek, lastWeekSoFar, week } = summary;
  const top = Math.max(1, ...week.map((d) => d.xp));
  return (
    <View style={s.card}>
      <Text style={s.cardEyebrow}>This week</Text>
      <View style={s.stats}>
        <Stat label="Tasks" value={String(thisWeek.tasks)} delta={delta(thisWeek, lastWeekSoFar, 'tasks')} />
        <Stat label="Time" value={thisWeek.minutes ? durationLabel(thisWeek.minutes) : '0 h'} delta={delta(thisWeek, lastWeekSoFar, 'minutes')} />
        <Stat label="XP" value={String(thisWeek.xp)} delta={delta(thisWeek, lastWeekSoFar, 'xp')} />
      </View>
      <View style={s.chart} accessibilityLabel={`XP per day this week: ${week.map((d) => d.xp).join(', ')}`}>
        {week.map((d, i) => (
          <View key={d.date} style={s.barCol}>
            <View style={s.barTrack}>
              {d.xp > 0 && <View style={[s.bar, d.date === today && s.barToday, { height: `${Math.max(6, (d.xp / top) * 100)}%` }]} />}
              {d.xp === 0 && <View style={[s.barEmpty, d.future && s.barFuture]} />}
            </View>
            <Text style={[s.barLabel, d.date === today && s.barLabelToday]}>{'MTWTFSS'[i]}</Text>
          </View>
        ))}
      </View>
      <Text style={s.small}>Arrows compare with the same days last week.</Text>
    </View>
  );
}

function delta(now: WeekTotals, before: WeekTotals, key: keyof WeekTotals): number {
  return now[key] - before[key];
}

function Stat({ label, value, delta }: { label: string; value: string; delta: number }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const shownDelta = label === 'Time' ? durationLabel(Math.abs(delta)) : String(Math.abs(delta));
  return (
    <View style={s.stat}>
      <GradientText style={s.statValue}>{value}</GradientText>
      <Text style={s.statLabel}>{label}</Text>
      {delta !== 0 && (
        <Text style={[s.statDelta, { color: delta > 0 ? c.xp : c.faint }]}>
          {delta > 0 ? '▲' : '▼'} {shownDelta}
        </Text>
      )}
    </View>
  );
}

function DayCard({ day, today }: { day: ActivityDay; today: string }) {
  const s = useStyles(makeStyles);
  const [open, setOpen] = useState(false);
  const tasks = open ? day.tasks : day.tasks.slice(0, TASKS_SHOWN);
  const hidden = day.tasks.length - tasks.length;
  return (
    <View style={s.day}>
      <View style={s.dayHead}>
        <Text style={s.dayLabel}>{activityDayLabel(day.date, today)}</Text>
        {day.xp > 0 && <GradientText style={s.dayXp}>+{day.xp} XP</GradientText>}
      </View>
      {day.taskCount > 0 && (
        <Text style={s.small}>
          {day.taskCount} {day.taskCount === 1 ? 'task' : 'tasks'} · {durationLabel(day.minutes)}
        </Text>
      )}
      {day.events.map((e, i) => (
        <EventRow key={i} event={e} />
      ))}
      {tasks.length > 0 && (
        <View style={s.tasks}>
          {tasks.map((t) => (
            <View key={t.title} style={s.taskRow}>
              <View style={s.taskDot} />
              <Text style={s.taskTitle} numberOfLines={1}>
                {t.title}
                {t.count > 1 && <Text style={s.taskCount}> ×{t.count}</Text>}
              </Text>
              <Text style={s.taskXp}>+{t.xp}</Text>
            </View>
          ))}
          {(hidden > 0 || open) && day.tasks.length > TASKS_SHOWN && (
            <Pressable onPress={() => setOpen(!open)} hitSlop={8} accessibilityRole="button">
              <Text style={s.showAll}>{open ? 'Show less' : `+${hidden} more`}</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

function EventRow({ event }: { event: ActivityEvent }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  let icon: React.ReactNode;
  let title: string;
  let sub: string | undefined;
  let xp: number | undefined;
  let color = c.text;
  switch (event.kind) {
    case 'level':
      icon = <Crown size={18} color={c.accent} strokeWidth={1.6} aria-hidden />;
      title = event.level - event.from > 1 ? `Levels ${event.from + 1} to ${event.level} reached` : `Reached level ${event.level}`;
      sub = event.rank && `New rank: ${event.rank}`;
      color = c.accent;
      break;
    case 'challenge':
      icon = <AppIcon name={event.icon} size={18} color={c.muted} />;
      title = event.title;
      sub = event.daily ? 'Daily challenge claimed' : 'Weekly challenge claimed';
      xp = event.xp;
      break;
    case 'achievement':
      icon = <AppIcon name={event.icon} size={18} color={c.muted} />;
      title = `${event.title}${event.tier ? ` · ${event.tier}` : ''}`;
      sub = 'Achievement claimed';
      xp = event.xp;
      break;
    case 'token': {
      const Icon = TOKEN_ICONS[event.token === 'recovery' ? 'rest' : event.token];
      color = event.token === 'double' ? c.accent : c.muted;
      icon = <Icon size={18} color={color} strokeWidth={1.5} aria-hidden />;
      title = { rest: 'Rest day: streak kept', recovery: 'Free save: streak kept', double: 'Double XP day', adfree: 'Ad-free day' }[event.token];
      break;
    }
    case 'wheel':
      color = event.rarity === 'legendary' || event.rarity === 'rare' ? c.accent : c.text;
      icon = <FerrisWheel size={18} color={event.rarity === 'common' ? c.muted : c.accent} strokeWidth={1.5} aria-hidden />;
      title = `Lucky wheel: ${event.prize}`;
      xp = event.xp || undefined;
      break;
    case 'steps':
      icon = <ListChecks size={18} color={c.muted} strokeWidth={1.5} aria-hidden />;
      title = `${event.count} ${event.count === 1 ? 'step' : 'steps'} of ${event.title}`;
      xp = event.xp || undefined;
      break;
    case 'season':
      icon = <Sparkles size={18} color={c.accent} strokeWidth={1.5} aria-hidden />;
      title = `Monthly event won: ${event.frame} frame`;
      color = c.accent;
      break;
    case 'fire':
      icon = <Fire tier={event.tier} size={18} />;
      if (event.change === 'up') {
        title = `Your fire rose to ${streakTierName(event.tier)}`;
        sub = `${event.days}-day streak`;
        color = fireColor(event.tier, c, c.text);
      } else if (event.change === 'down') {
        title = `Missed a day: fire dropped to ${streakTierName(event.tier)}`;
        sub = `Streak kept at ${event.days} days`;
        color = c.muted;
      } else {
        title = `Missed a day: ${event.days}-day streak ended`;
        color = c.muted;
      }
      break;
  }
  return (
    <View style={s.event}>
      <View style={s.eventIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={[s.eventTitle, { color }]}>{title}</Text>
        {sub && <Text style={s.small}>{sub}</Text>}
      </View>
      {!!xp && <Text style={s.taskXp}>+{xp}</Text>}
    </View>
  );
}

const makeStyles = themed((c) => ({
  content: { padding: 20, paddingTop: 8, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  intro: { color: c.muted, fontSize: 13, lineHeight: 18, marginBottom: 12 },
  card: { ...card(c), padding: 16, gap: 10, marginBottom: 18 },
  cardEyebrow: { ...eyebrow(c, 11), color: c.muted },
  stats: { flexDirection: 'row' },
  stat: { flex: 1 },
  statValue: { fontFamily: VIVID_HEAVY, fontSize: 26, lineHeight: 30, fontVariant: ['lining-nums'] },
  statLabel: { color: c.muted, fontSize: 12 },
  statDelta: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  chart: { flexDirection: 'row', gap: 8, height: 92, marginTop: 4 },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '70%', maxWidth: 22, borderTopLeftRadius: 4, borderTopRightRadius: 4, ...fill(BRAND, 180), opacity: 0.45 },
  barToday: { ...fill(BRAND, 180), opacity: 1 },
  barEmpty: { width: '70%', maxWidth: 22, height: 2, backgroundColor: c.border },
  barFuture: { opacity: 0.4 },
  barLabel: { color: c.faint, fontSize: 11, fontWeight: '600' },
  barLabelToday: { color: c.accent },
  small: { color: c.faint, fontSize: 12 },
  empty: { color: c.muted, fontSize: 14, textAlign: 'center', marginTop: 12 },
  day: { borderTopWidth: 1, borderTopColor: c.border, paddingTop: 14, paddingBottom: 16, gap: 8 },
  dayHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  dayLabel: { fontFamily: FONTS.serif, color: c.text, fontSize: 20 },
  dayXp: { fontFamily: VIVID_HEAVY, fontSize: 14, fontVariant: ['tabular-nums'] },
  event: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eventIcon: {
    width: 32,
    height: 32,
    borderRadius: c.radius,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventTitle: { fontSize: 14, fontWeight: '600' },
  tasks: { gap: 6, paddingLeft: 4 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  taskDot: { width: 5, height: 5, transform: [{ rotate: '45deg' }], backgroundColor: c.outline },
  taskTitle: { flex: 1, color: c.muted, fontSize: 14 },
  taskCount: { color: c.faint },
  taskXp: { color: c.faint, fontSize: 13, fontVariant: ['tabular-nums'] },
  showAll: { color: c.accent, fontSize: 13, fontWeight: '600', paddingLeft: 15 },
  more: { alignSelf: 'center', paddingHorizontal: 18, minHeight: 40, justifyContent: 'center', borderRadius: c.radius, borderWidth: 1, borderColor: c.border, marginTop: 8 },
  moreText: { color: c.text, fontWeight: '600' },
}));
