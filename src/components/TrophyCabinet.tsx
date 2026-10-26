import { Lock, Pin } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SHOWCASE_SIZE, type Rarity, type TrophyStatus } from '../trophies';
import { card, eyebrow, FONTS, nativeDriver, themed, useStyles, useTheme } from '../theme';
import { ICON_GLYPHS, RARITY, rarityLabel, type Rarity as VividRarity } from '../vivid';
import { useReduceMotion } from './FireAura';
import { fill, Glyph, HexSticker, VividButton } from './Vivid';
import { num, t } from '../i18n';

/** Trophy rarities in the vivid rarity colours. */
const RARITY_OF: Record<Rarity, VividRarity> = { rare: 'rare', epic: 'epic', legendary: 'legendary' };

/**
 * A hexagonal badge in its rarity gradient with a glyph (rewards spec);
 * legendary ones get a shine sweeping across. Faint with a lock until earned.
 */
export function TrophyBadge({ trophy, size }: { trophy: TrophyStatus; size: number }) {
  const c = useTheme();
  const rarity = RARITY_OF[trophy.def.rarity];
  const ink = trophy.earned ? RARITY[rarity].ink : c.faint;
  return (
    <View style={{ width: size, height: size * 1.1, alignItems: 'center', justifyContent: 'center' }}>
      <HexSticker rarity={rarity} size={size} dim={!trophy.earned}>
        <Glyph name={ICON_GLYPHS[trophy.def.icon]} size={Math.round(size * 0.4)} color={trophy.earned ? ink : c.text} style={!trophy.earned ? { opacity: 0.5 } : undefined} />
      </HexSticker>
      {trophy.earned && rarity === 'legendary' && <Shine size={size} />}
      {!trophy.earned && (
        <View style={{ position: 'absolute', bottom: size * 0.04 }}>
          <Lock size={Math.round(size * 0.16)} color={c.muted} strokeWidth={2} aria-hidden />
        </View>
      )}
    </View>
  );
}

/** A white shine sweeping across the badge every 3.2 s. */
function Shine({ size }: { size: number }) {
  const reduce = useReduceMotion();
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(Animated.sequence([Animated.timing(t, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: nativeDriver }), Animated.delay(2300)]));
    loop.start();
    return () => loop.stop();
  }, [reduce]);
  if (reduce) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: size * 0.1, top: size * 0.1, width: size * 0.8, height: size * 0.9, overflow: 'hidden', borderRadius: size * 0.2 }}>
      <Animated.View
        style={{
          position: 'absolute',
          top: -size * 0.2,
          width: size * 0.18,
          height: size * 1.4,
          backgroundColor: '#FFFFFF',
          opacity: 0.45,
          transform: [{ translateX: t.interpolate({ inputRange: [0, 1], outputRange: [-size * 0.3, size] }) }, { rotate: '20deg' }],
        }}
      />
    </View>
  );
}

/**
 * The profile's trophy cabinet; tapping a trophy shows how it is earned and
 * how far along you are, and a won one can be pinned to the profile.
 */
export function TrophyCabinet({ trophies, pinned = [], onPin }: { trophies: TrophyStatus[]; /** Trophy ids pinned to the profile. */ pinned?: string[]; onPin?: (id: string) => void }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const [open, setOpen] = useState<TrophyStatus | null>(null);
  // Earned first, then the ones closest to done.
  const sorted = [...trophies].sort(
    (a, b) => Number(b.earned) - Number(a.earned) || b.value / b.def.target - a.value / a.def.target,
  );
  return (
    <>
      <View style={s.grid}>
        {sorted.map((tr) => (
          <Pressable
            key={tr.def.id}
            onPress={() => setOpen(tr)}
            style={s.cell}
            accessibilityRole="button"
            accessibilityLabel={`${t(tr.def.name)}, ${tr.earned ? t('earned') : t('locked')}${pinned.includes(tr.def.id) && tr.earned ? `, ${t('pinned to your profile')}` : ''}. ${t(tr.def.description)}`}
          >
            <TrophyBadge trophy={tr} size={64} />
            {pinned.includes(tr.def.id) && tr.earned && (
              <View style={s.pin}>
                <Pin size={11} color={c.text} strokeWidth={2.4} aria-hidden />
              </View>
            )}
            <Text style={[s.name, !tr.earned && s.nameLocked]} numberOfLines={1}>
              {t(tr.def.name)}
            </Text>
            {tr.earned ? (
              <Text style={[s.rarity, { color: rarityLabel(RARITY_OF[tr.def.rarity], c.dark) }]}>{t(RARITY[RARITY_OF[tr.def.rarity]].name)}</Text>
            ) : (
              <View style={s.miniTrack}>
                <View style={[s.miniFill, fill(RARITY[RARITY_OF[tr.def.rarity]], 90), { width: `${(tr.value / tr.def.target) * 100}%` }]} />
              </View>
            )}
          </Pressable>
        ))}
      </View>

      <Modal visible={!!open} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(null)} accessibilityLabel={t('Close')} />
        {open && (
          <SafeAreaView style={s.sheetWrap} pointerEvents="box-none">
            <View style={s.sheet}>
              <TrophyBadge trophy={open} size={120} />
              <Text style={[s.rarity, { color: rarityLabel(RARITY_OF[open.def.rarity], c.dark) }]}>{t('{rarity} trophy', { rarity: t(RARITY[RARITY_OF[open.def.rarity]].name) })}</Text>
              <Text style={s.title}>{t(open.def.name)}</Text>
              <Text style={s.desc}>{t(open.def.description)}</Text>
              <View style={s.track}>
                <View style={[s.fill, fill(RARITY[RARITY_OF[open.def.rarity]], 90), { width: `${(open.value / open.def.target) * 100}%` }]} />
              </View>
              <Text style={s.progress}>
                {open.earned
                  ? t('Earned')
                  : `${num(open.value)} / ${num(open.def.target)} ${t(open.def.unit)}`}
              </Text>
              {open.earned && onPin && <PinButton id={open.def.id} pinned={pinned} onPin={onPin} />}
              <VividButton label={t('Close')} kind="secondary" onPress={() => setOpen(null)} style={{ alignSelf: 'stretch', marginTop: open.earned && onPin ? 0 : 8 }} />
            </View>
          </SafeAreaView>
        )}
      </Modal>
    </>
  );
}

/** Pins a won trophy to the profile's showcase, or takes it off; says so when the showcase is full. */
function PinButton({ id, pinned, onPin }: { id: string; pinned: string[]; onPin: (id: string) => void }) {
  const s = useStyles(makeStyles);
  const on = pinned.includes(id);
  if (!on && pinned.length >= SHOWCASE_SIZE) return <Text style={s.progress}>{t('Your showcase is full: unpin one of your {n} first.', { n: SHOWCASE_SIZE })}</Text>;
  return (
    <VividButton
      label={on ? t('Unpin from profile') : t('Pin to profile')}
      kind={on ? 'secondary' : 'primary'}
      onPress={() => onPin(id)}
      style={{ alignSelf: 'stretch', marginTop: 8 }}
      accessibilityLabel={on ? t('Unpin this trophy from your profile') : t('Pin this trophy to your profile, {n} of {total} spots free', { n: SHOWCASE_SIZE - pinned.length, total: SHOWCASE_SIZE })}
    />
  );
}

const makeStyles = themed((c) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 18 },
  cell: { width: '33.33%', alignItems: 'center', gap: 6 },
  pin: { position: 'absolute', top: 0, right: '22%', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  name: { color: c.text, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  nameLocked: { color: c.muted },
  rarity: { ...eyebrow(c, 10), fontWeight: '700' },
  miniTrack: { width: 52, height: 3, borderRadius: 2, backgroundColor: c.border, overflow: 'hidden', marginTop: 3 },
  miniFill: { height: '100%', backgroundColor: c.accent },
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#000', opacity: 0.6 },
  sheetWrap: { flex: 1, justifyContent: 'center', padding: 24 },
  sheet: { ...card(c), backgroundColor: c.bg, maxWidth: 380, width: '100%', alignSelf: 'center', padding: 24, alignItems: 'center', gap: 10 },
  title: { fontFamily: FONTS.serif, color: c.text, fontSize: 28, textAlign: 'center' },
  desc: { color: c.muted, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  track: { alignSelf: 'stretch', height: 6, borderRadius: 3, backgroundColor: c.border, overflow: 'hidden', marginTop: 8 },
  fill: { height: '100%', backgroundColor: c.accent },
  progress: { color: c.muted, fontSize: 13, fontVariant: ['tabular-nums'] },
}));
