import { Check } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { milestoneLabel, nextLevelReward } from '../achievements';
import { levelInfo, nextTier, STREAK_TIERS, streakBonus, streakTierName, type StreakStatus } from '../game';
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
  const info = levelInfo(totalXp);
  const bonus = streakBonus(streak.days);
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
                    {tn(streak.days, '{n}-day streak#one', '{n}-day streak')} · {streakTierName(streak.tier)}
                  </Text>
                  <Text style={s.muted}>
                    {bonus > 0 ? t('{x}x XP on every task', { x: decimal(1 + bonus) }) : t('No XP bonus yet')}
                  </Text>
                </View>
              </View>
              <TierLadder streak={streak} />
              <Text style={s.note}>
                {t('Do at least one task a day. Your fire grows with your streak, and every tier adds XP to each task. A missed day ends the streak, unless you use a rest day.')}
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
 * The fire tiers as one ladder (rework 2026-11-01): each tier's fire, the
 * streak days it takes and the XP bonus it gives, ticked once reached, and
 * how many days are left to the next. Also shown in the first-time tour.
 */
export function TierLadder({ streak }: { streak: Pick<StreakStatus, 'days' | 'tier'> }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const next = nextTier(streak.days);
  return (
    <View style={{ gap: 8 }}>
      {STREAK_TIERS.map((tier) => {
        const on = streak.tier >= tier.tier;
        return (
          <View key={tier.tier} style={[s.tierRow, on && s.tierRowOn]}>
            <FireAura tier={tier.tier} id={`ladder-${tier.tier}`} />
            <Fire tier={tier.tier} size={18} />
            <Text style={[s.tierName, { color: fireColor(tier.tier, c) }]}>{t(tier.name)}</Text>
            <Text style={[s.muted, { flex: 1 }]}>{tn(tier.days, '{n} day', '{n} days')}</Text>
            <Text style={[s.tierBonus, on && { color: c.text }]}>{t('{x}x XP', { x: decimal(1 + tier.bonus) })}</Text>
            {on && <Check size={14} color={c.accent} strokeWidth={2} aria-hidden />}
          </View>
        );
      })}
      <Text style={s.muted}>
        {next ? tn(next.daysLeft, '{n} more day to {tier}', '{n} more days to {tier}', { tier: t(next.tier.name) }) : t('Legend reached. The top tier!')}
      </Text>
    </View>
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
  tierName: { fontWeight: '700', fontSize: 14, width: 64 },
  tierRowOn: { borderColor: brandLine(c), backgroundColor: c.surface, boxShadow: `0px 0px 10px ${brandGlow(0.3)}` },
  tierBonus: { color: c.muted, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  note: { color: c.faint, fontSize: 12, lineHeight: 17 },
  rewardIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  close: { minHeight: 46, borderRadius: c.radius, borderWidth: 1, borderColor: c.outline, alignItems: 'center', justifyContent: 'center' },
  closeText: { ...eyebrow(c, 12), fontWeight: '700', color: c.text },
}));
