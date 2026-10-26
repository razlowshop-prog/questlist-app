import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { milestoneLabel, upcomingLevelRewards } from '../achievements';
import { levelInfo } from '../game';
import { card, eyebrow, FONTS, headingCase, themed, useStyles } from '../theme';
import { RewardPicture } from './RewardPicture';
import { brandGlow, brandLine } from '../vivid';
import { num, t } from '../i18n';

/**
 * Opened by tapping the XP bar: the rewards of the next levels as pictures in
 * a row across the screen, nearest first, each with the XP still to go.
 * Swipe sideways for more.
 */
export function LevelRewards({ visible, totalXp, onClose }: { visible: boolean; totalXp: number; onClose: () => void }) {
  const s = useStyles(makeStyles);
  const info = levelInfo(totalXp);
  const upcoming = upcomingLevelRewards(totalXp);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel={t('Close')} />
      <SafeAreaView style={s.sheetWrap} pointerEvents="box-none">
        <View style={s.sheet}>
          <View style={{ gap: 4 }}>
            <Text style={s.eyebrow}>{t('Level {n}', { n: info.level })}</Text>
            <Text style={s.title}>{t('Coming up')}</Text>
            <Text style={s.muted}>
              {info.maxed ? t('Max level. Every level reward is yours.') : t('Every level brings a reward. Here are the next ones.')}
            </Text>
          </View>

          {upcoming.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
              {upcoming.map(({ milestone, xpAway }, i) => {
                const label = milestoneLabel(milestone);
                return (
                  <View
                    key={milestone.level}
                    style={[s.item, i === 0 && s.itemNext]}
                    accessible
                    accessibilityLabel={t('Level {n}: {reward}, in {xp} XP', { n: milestone.level, reward: label, xp: num(xpAway) })}
                  >
                    <Text style={[s.level, i === 0 && s.levelNext]}>{t('Level {n}', { n: milestone.level })}</Text>
                    <View style={s.picture}>
                      <RewardPicture milestone={milestone} size={milestone.reward?.kind === 'frame' ? 56 : 44} />
                    </View>
                    <Text style={s.label} numberOfLines={2}>
                      {label}
                    </Text>
                    <Text style={s.away}>{t('in {n} XP', { n: num(xpAway) })}</Text>
                  </View>
                );
              })}
            </ScrollView>
          )}

          <Pressable onPress={onClose} style={s.close} accessibilityRole="button">
            <Text style={s.closeText}>{t('Close')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const makeStyles = themed((c) => ({
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#000', opacity: 0.55 },
  sheetWrap: { flex: 1, justifyContent: 'center', padding: 20 },
  sheet: { ...card(c), backgroundColor: c.bg, maxWidth: 480, width: '100%', alignSelf: 'center', padding: 20, gap: 18 },
  eyebrow: { ...eyebrow(c, 12), color: c.label },
  title: { fontFamily: FONTS.serif, color: c.text, fontSize: 30, lineHeight: 36, ...headingCase(c) },
  muted: { color: c.muted, fontSize: 13 },
  row: { gap: 10, paddingVertical: 4, paddingRight: 4 },
  item: { ...card(c), width: 104, padding: 10, gap: 6, alignItems: 'center' },
  itemNext: { borderColor: brandLine(c), boxShadow: `0px 0px 12px ${brandGlow(0.35)}` },
  level: { ...eyebrow(c, 10), color: c.muted },
  levelNext: { color: c.accent },
  picture: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  label: { color: c.text, fontSize: 12, fontWeight: '700', textAlign: 'center', minHeight: 32, lineHeight: 16 },
  away: { color: c.faint, fontSize: 11, fontVariant: ['tabular-nums'] },
  close: { minHeight: 46, borderRadius: c.radius, borderWidth: 1, borderColor: c.outline, alignItems: 'center', justifyContent: 'center' },
  closeText: { ...eyebrow(c, 12), fontWeight: '700', color: c.text },
}));
