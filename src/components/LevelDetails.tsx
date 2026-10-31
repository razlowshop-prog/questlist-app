import { Check } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { milestoneLabel, nextLevelReward } from '../achievements';
import {
  levelInfo,
  nextStreakBonus,
  STREAK_BONUSES,
  STREAK_TIERS,
  streakBonus,
  streakTierName,
  weekTierProgress,
  type StreakStatus,
} from '../game';
import { card, eyebrow, FONTS, headingCase, themed, useStyles, useTheme } from '../theme';
import { Fire, fireColor } from './Fire';
import { FireAura } from './FireAura';
import { RewardPicture } from './RewardPicture';
import { brandLine, brandGlow } from '../vivid';
import { decimal, num, t, tn } from '../i18n';

/** Opened by tapping the streak card: XP, the streak multiplier and fire tiers, the next reward. */
export function LevelDetails({
  visible,
  totalXp,
  streak,
  onClose,
}: {
  visible: boolean;
  totalXp: number;
  streak: StreakStatus;
  onClose: () => void;
}) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const info = levelInfo(totalXp);
  const bonus = streakBonus(streak.days);
  const next = nextStreakBonus(streak.days);
  const reward = nextLevelReward(totalXp);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel={t('Close')} />
      <SafeAreaView style={s.sheetWrap} pointerEvents="box-none">
        <View style={s.sheet}>
          <ScrollView contentContainerStyle={{ gap: 18 }}>
            <View style={{ gap: 4 }}>
              <Text style={s.eyebrow}>{t('Level {n}', { n: info.level })}</Text>
              <Text style={s.title}>{info.rank}</Text>
              <Text style={s.muted}>
                {info.maxed
                  ? t('Max level · {total} XP in total', { total: num(totalXp) })
                  : t('{n} XP to level {level} · {total} XP in total', { n: num(info.xpForLevel - info.xpIntoLevel), level: info.level + 1, total: num(totalXp) })}
              </Text>
            </View>

            <View style={s.section}>
              <View style={s.row}>
                <Fire tier={streak.tier} size={30} />
                <View style={{ flex: 1 }}>
                  <Text style={s.sectionTitle}>
                    {t('{n}-day streak', { n: streak.days })} · {streakTierName(streak.tier)}
                  </Text>
                  <Text style={s.muted}>
                    {bonus > 0 ? t('{x}x XP on every task', { x: decimal(1 + bonus) }) : t('No XP bonus yet')}
                    {next ? ` · ${tn(next.daysLeft, '{n} more day to {x}x', '{n} more days to {x}x', { x: decimal(1 + next.bonus) })}` : ''}
                  </Text>
                </View>
              </View>
              <Text style={s.small}>{t('Streak bonus')}</Text>
              <View style={s.steps}>
                {STREAK_BONUSES.map((b) => {
                  const on = streak.days >= b.days;
                  return (
                    <View key={b.days} style={[s.step, on && s.stepOn]}>
                      <Text style={[s.stepValue, on && s.stepValueOn]}>{decimal(1 + b.bonus)}x</Text>
                      <Text style={s.stepDays}>{tn(b.days, '{n} day', '{n} days')}</Text>
                      {on && <Check size={12} color={c.accent} strokeWidth={2} aria-hidden />}
                    </View>
                  );
                })}
              </View>
              <Text style={s.small}>{t('Fire tiers')}</Text>
              <WeekBar streak={streak} />
              {STREAK_TIERS.map((tier) => (
                <View key={tier.tier} style={s.tierRow}>
                  <FireAura tier={tier.tier} id={`tier-${tier.tier}`} />
                  <Fire tier={tier.tier} size={18} />
                  <Text style={[s.tierName, { color: fireColor(tier.tier, c) }]}>{t(tier.name)}</Text>
                  <Text style={s.muted}>{tier.tier === 1 ? t('{n} XP, instantly', { n: tier.weekXp }) : t('{n} XP a week', { n: tier.weekXp })}</Text>
                  {streak.tier >= tier.tier ? (
                    <Check size={14} color={c.accent} strokeWidth={2} aria-hidden />
                  ) : tier.tier > 1 && streak.weekXp >= tier.weekXp ? (
                    <Text style={[s.weekMark, { color: fireColor(tier.tier, c) }]}>{t('this week ✓')}</Text>
                  ) : null}
                </View>
              ))}
              <Text style={s.note}>
                {t(
                  'Flame lights the moment your streak earns {n} XP. For Blaze and Inferno, reach the threshold in a week and your fire moves up on Monday. Keep it going with one task a day: a missed day costs a tier, and on Flame or below it ends the streak.',
                  { n: STREAK_TIERS[0].weekXp },
                )}
              </Text>
            </View>

            {reward && (
              <View style={[s.section, s.row]}>
                <View style={s.rewardIcon}>
                  <RewardPicture milestone={reward.milestone} size={reward.milestone.reward?.kind === 'theme' ? 22 : 18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.sectionTitle}>{t('Next reward at level {n}', { n: reward.milestone.level })}</Text>
                  <Text style={s.muted}>
                    {milestoneLabel(reward.milestone)} · {reward.xpInto} / {reward.xpNeeded} XP
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
          <Pressable onPress={onClose} style={s.close} accessibilityRole="button">
            <Text style={s.closeText}>{t('Close')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

/**
 * This week's XP on a bar marked at each fire tier, with how much is still
 * needed for the next one and what Monday brings.
 */
function WeekBar({ streak }: { streak: StreakStatus }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const top = STREAK_TIERS[STREAK_TIERS.length - 1].weekXp;
  const share = Math.min(1, streak.weekXp / top);
  const { next, toGo, mondayUp, reached } = weekTierProgress(streak);
  const line = next
    ? t('{n} XP more this week for {tier}', { n: toGo, tier: t(next.name) })
    : t('Inferno reached this week. The top tier!');
  return (
    <View style={s.week} accessibilityLabel={`${t('This week: {n} XP', { n: num(streak.weekXp) })}. ${line}`}>
      <View style={s.weekHead}>
        <Text style={s.weekTitle}>{t('This week: {n} XP', { n: num(streak.weekXp) })}</Text>
        {reached > 0 && <Text style={[s.weekTier, { color: fireColor(reached, c) }]}>{streakTierName(reached)}</Text>}
      </View>
      <View style={s.weekTrack}>
        <View style={[s.weekFill, { width: `${share * 100}%`, backgroundColor: fireColor(Math.max(1, reached), c) }]} />
        {STREAK_TIERS.map((tier) => (
          <View key={tier.tier} style={[s.weekTick, { left: `${(tier.weekXp / top) * 100}%` }, streak.weekXp >= tier.weekXp && { backgroundColor: c.text }]} />
        ))}
      </View>
      <View style={s.weekScale}>
        {STREAK_TIERS.map((tier) => (
          <Text key={tier.tier} style={[s.weekLabel, { left: `${(tier.weekXp / top) * 100}%` }]}>
            {tier.weekXp}
          </Text>
        ))}
      </View>
      <Text style={s.muted}>
        {line}
        {mondayUp ? ` ${t('Your fire moves up to {tier} on Monday.', { tier: streakTierName(reached) })}` : ''}
      </Text>
    </View>
  );
}

const makeStyles = themed((c) => ({
  week: { gap: 6, paddingVertical: 2 },
  weekHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  weekTitle: { color: c.text, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  weekTier: { fontSize: 13, fontWeight: '800' },
  weekTrack: { height: 10, borderRadius: 5, backgroundColor: c.border, overflow: 'hidden' },
  weekFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 5 },
  weekTick: { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -2, backgroundColor: c.faint },
  weekScale: { height: 14 },
  weekLabel: { position: 'absolute', width: 40, marginLeft: -38, textAlign: 'right', color: c.faint, fontSize: 11, fontVariant: ['tabular-nums'] },
  weekMark: { fontSize: 11, fontWeight: '700' },
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#000', opacity: 0.55 },
  sheetWrap: { flex: 1, justifyContent: 'center', padding: 20 },
  sheet: { ...card(c), backgroundColor: c.bg, maxWidth: 480, width: '100%', alignSelf: 'center', maxHeight: '90%', padding: 20, gap: 16 },
  eyebrow: { ...eyebrow(c, 12), color: c.label },
  title: { fontFamily: FONTS.serif, color: c.text, fontSize: 30, lineHeight: 36, ...headingCase(c) },
  muted: { color: c.muted, fontSize: 13 },
  section: { ...card(c), padding: 14, gap: 12 },
  sectionTitle: { color: c.text, fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  small: { ...eyebrow(c, 11), color: c.muted },
  steps: { flexDirection: 'row', gap: 8 },
  step: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 8, borderRadius: c.radius, borderWidth: 1, borderColor: c.border },
  stepOn: { borderColor: brandLine(c), backgroundColor: c.surface, boxShadow: `0px 0px 10px ${brandGlow(0.3)}` },
  stepValue: { fontFamily: FONTS.serif, color: c.muted, fontSize: 18, fontVariant: ['lining-nums'] },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    minHeight: 44,
    borderRadius: c.radius,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  stepValueOn: { color: c.accent },
  stepDays: { color: c.faint, fontSize: 11 },
  tierName: { fontWeight: '700', fontSize: 14, width: 64 },
  note: { color: c.faint, fontSize: 12, lineHeight: 17 },
  rewardIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  close: { minHeight: 46, borderRadius: c.radius, borderWidth: 1, borderColor: c.outline, alignItems: 'center', justifyContent: 'center' },
  closeText: { ...eyebrow(c, 12), fontWeight: '700', color: c.text },
}));
