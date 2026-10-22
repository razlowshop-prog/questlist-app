import { Check } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { nextLevelReward } from '../achievements';
import {
  levelInfo,
  nextStreakBonus,
  STREAK_BONUSES,
  STREAK_TIERS,
  streakBonus,
  streakTierName,
  type StreakStatus,
} from '../game';
import { card, eyebrow, FONTS, headingCase, themed, useStyles, useTheme } from '../theme';
import { Fire, fireColor } from './Fire';
import { FireAura } from './FireAura';
import { RewardPicture } from './RewardPicture';

/** Opened by tapping the level: XP, the streak multiplier and fire tiers, the next reward. */
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
      <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={s.sheetWrap} pointerEvents="box-none">
        <View style={s.sheet}>
          <ScrollView contentContainerStyle={{ gap: 18 }}>
            <View style={{ gap: 4 }}>
              <Text style={s.eyebrow}>Level {info.level}</Text>
              <Text style={s.title}>{info.rank}</Text>
              <Text style={s.muted}>
                {info.maxed
                  ? `Max level · ${totalXp.toLocaleString()} XP in total`
                  : `${(info.xpForLevel - info.xpIntoLevel).toLocaleString()} XP to level ${info.level + 1} · ${totalXp.toLocaleString()} XP in total`}
              </Text>
            </View>

            <View style={s.section}>
              <View style={s.row}>
                <Fire tier={streak.tier} size={30} />
                <View style={{ flex: 1 }}>
                  <Text style={s.sectionTitle}>
                    {streak.days}-day streak · {streakTierName(streak.tier)}
                  </Text>
                  <Text style={s.muted}>
                    {bonus > 0 ? `${(1 + bonus).toFixed(1)}x XP on every task` : 'No XP bonus yet'}
                    {next ? ` · ${next.daysLeft} more ${next.daysLeft === 1 ? 'day' : 'days'} to ${(1 + next.bonus).toFixed(1)}x` : ''}
                  </Text>
                </View>
              </View>
              <Text style={s.small}>Streak bonus</Text>
              <View style={s.steps}>
                {STREAK_BONUSES.map((b) => {
                  const on = streak.days >= b.days;
                  return (
                    <View key={b.days} style={[s.step, on && s.stepOn]}>
                      <Text style={[s.stepValue, on && s.stepValueOn]}>{(1 + b.bonus).toFixed(1)}x</Text>
                      <Text style={s.stepDays}>{b.days} days</Text>
                      {on && <Check size={12} color={c.accent} strokeWidth={2} aria-hidden />}
                    </View>
                  );
                })}
              </View>
              <Text style={s.small}>Fire tiers</Text>
              {STREAK_TIERS.map((t) => (
                <View key={t.tier} style={s.tierRow}>
                  <FireAura tier={t.tier} id={`tier-${t.tier}`} />
                  <Fire tier={t.tier} size={18} />
                  <Text style={[s.tierName, { color: fireColor(t.tier, c) }]}>{t.name}</Text>
                  <Text style={s.muted}>{t.weekXp} XP a week</Text>
                  {streak.tier >= t.tier && <Check size={14} color={c.accent} strokeWidth={2} aria-hidden />}
                </View>
              ))}
              <Text style={s.note}>
                This week: {streak.weekXp} XP. Reach a threshold and your fire moves up on Monday. Keep it going with one task
                a day: a missed day costs a tier, and on Flame or below it ends the streak.
              </Text>
            </View>

            {reward && (
              <View style={[s.section, s.row]}>
                <View style={s.rewardIcon}>
                  <RewardPicture milestone={reward.milestone} size={reward.milestone.reward?.kind === 'theme' ? 22 : 18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.sectionTitle}>Next reward at level {reward.milestone.level}</Text>
                  <Text style={s.muted}>
                    {reward.milestone.reward?.label ?? `+${reward.milestone.bonusXp} XP bonus`} · {reward.xpInto} / {reward.xpNeeded} XP
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
          <Pressable onPress={onClose} style={s.close} accessibilityRole="button">
            <Text style={s.closeText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = themed((c) => ({
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
  stepOn: { borderColor: c.accent, backgroundColor: c.accentSoft },
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
  rewardIcon: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  close: { minHeight: 46, borderRadius: c.radius, borderWidth: 1, borderColor: c.outline, alignItems: 'center', justifyContent: 'center' },
  closeText: { ...eyebrow(c, 12), fontWeight: '700', color: c.text },
}));
