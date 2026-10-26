import { useState } from 'react';
import { Modal, Pressable, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { APP_NAME } from '../brand';
import { recapShareText, type WeekRecap } from '../recap';
import { card, eyebrow, FONTS, headingCase, themed, useStyles, useTheme } from '../theme';
import { brandLine, RARITY } from '../vivid';
import { GradientText, Sticker, VIVID_HEAVY, VividButton } from './Vivid';
import { t, tn } from '../i18n';
import { durationLabel } from '../game';

/**
 * The weekly recap on Today: a card that opens the full look back at the
 * week, with Share. Closing either one marks the week as seen.
 */
export function WeeklyRecap({ recap, onSeen }: { recap: WeekRecap; onSeen: () => void }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const [open, setOpen] = useState(false);
  const diff = recap.tasks - recap.lastWeekTasks;
  const compare =
    recap.lastWeekTasks === 0
      ? t('Your first full week. Nice start!')
      : diff > 0
        ? tn(diff, '{n} more task than the week before.', '{n} more tasks than the week before.')
        : diff === 0
          ? t('As many tasks as the week before.')
          : t('A quieter week than the one before. Next week is a fresh start.');

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={s.card} accessibilityRole="button" accessibilityLabel={t('Your week: {n} tasks, {xp} XP. Open the recap', { n: recap.tasks, xp: recap.xp })}>
        <Sticker grad={RARITY.epic} glyph="CalendarCheck" size={38} flat />
        <View style={{ flex: 1 }}>
          <Text style={s.cardEyebrow}>{t('Your week')}</Text>
          <Text style={s.cardText}>
            {tn(recap.tasks, '{n} task', '{n} tasks')} · +{recap.xp} XP
          </Text>
        </View>
        <Text style={s.open}>{t('See recap')}</Text>
        <Pressable onPress={onSeen} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('Close the weekly recap')}>
          <Text style={s.close}>✕</Text>
        </Pressable>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)} accessibilityLabel={t('Close')} />
        <SafeAreaView style={s.wrap} pointerEvents="box-none">
          <View style={s.sheet}>
            <Sticker grad={RARITY.epic} glyph="CalendarCheck" size={64} />
            <Text style={s.eyebrow}>{t('Weekly recap')}</Text>
            <Text style={s.title}>{t('Your week')}</Text>
            <View style={s.grid}>
              <Stat value={String(recap.tasks)} label={recap.tasks === 1 ? t('task done') : t('tasks done')} />
              <Stat value={`+${recap.xp}`} label={t('XP from tasks')} />
              <Stat value={`${recap.activeDays}/7`} label={t('active days')} />
              <Stat value={durationLabel(recap.minutes)} label={t('of tasks')} />
            </View>
            {recap.bestDay && (
              <Text style={s.line}>
                {t('Best day:')} <Text style={{ color: brandLine(c), fontWeight: '700' }}>{t(recap.bestDay.name)}</Text>{' '}
                {tn(recap.bestDay.tasks, 'with {n} task', 'with {n} tasks')}
              </Text>
            )}
            <Text style={s.line}>{compare}</Text>
            <View style={s.buttons}>
              <VividButton label={t('Share')} onPress={() => Share.share({ message: recapShareText(recap, APP_NAME) }).catch(() => {})} style={{ flex: 1 }} />
              <VividButton
                label={t('Done')}
                kind="secondary"
                onPress={() => {
                  setOpen(false);
                  onSeen();
                }}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const s = useStyles(makeStyles);
  return (
    <View style={s.stat}>
      <GradientText style={s.statValue}>{value}</GradientText>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = themed((c) => ({
  card: { ...card(c), flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginTop: 10 },
  cardEyebrow: { ...eyebrow(c, 10), color: c.muted },
  cardText: { color: c.text, fontSize: 15, fontWeight: '700', marginTop: 2 },
  open: { color: c.accent, fontSize: 13, fontWeight: '700' },
  close: { color: c.faint, fontSize: 14, paddingLeft: 4 },
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#000', opacity: 0.6 },
  wrap: { flex: 1, justifyContent: 'center', padding: 20 },
  sheet: { ...card(c), backgroundColor: c.bg, maxWidth: 420, width: '100%', alignSelf: 'center', padding: 22, alignItems: 'center', gap: 6 },
  eyebrow: { ...eyebrow(c, 11), color: c.muted, marginTop: 8 },
  title: { fontFamily: FONTS.serif, color: c.text, fontSize: 28, lineHeight: 34, ...headingCase(c) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 10, width: '100%' },
  stat: { ...card(c), flexBasis: '45%', flexGrow: 1, padding: 12, alignItems: 'center' },
  statValue: { fontFamily: VIVID_HEAVY, fontSize: 26, lineHeight: 32, fontVariant: ['lining-nums'] },
  statLabel: { color: c.muted, fontSize: 12 },
  line: { color: c.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 14, width: '100%' },
}));
