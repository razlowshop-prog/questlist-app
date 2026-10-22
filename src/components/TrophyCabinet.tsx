import { Lock } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Polygon, Stop } from 'react-native-svg';
import type { Rarity, TrophyStatus } from '../trophies';
import { card, eyebrow, FONTS, themed, useStyles, useTheme } from '../theme';
import { AppIcon } from './AppIcon';

/** Metal of each rarity: gradient top and bottom, and the icon colour on it. */
const METAL: Record<Rarity, { from: string; to: string; icon: string; name: string }> = {
  rare: { from: '#C9D1DA', to: '#8A95A1', icon: '#1F262E', name: 'Rare' },
  epic: { from: '#E2C48B', to: '#B08A4E', icon: '#3B2A0E', name: 'Epic' },
  legendary: { from: '#C4B0E2', to: '#7E64A8', icon: '#21173A', name: 'Legendary' },
};

/** Rarity label colour: the light end of the metal on dark themes, the deep end on light ones. */
function labelColor(rarity: Rarity, dark: boolean): string {
  return dark ? METAL[rarity].from : METAL[rarity].to;
}

const HEX = '50,3 95,28 95,82 50,107 5,82 5,28';
const INNER = '50,13 86,33 86,77 50,97 14,77 14,33';

/** A hexagonal badge: polished metal once earned, a dark outline with a lock until then. */
export function TrophyBadge({ trophy, size }: { trophy: TrophyStatus; size: number }) {
  const c = useTheme();
  const metal = METAL[trophy.def.rarity];
  const id = `trophy-${trophy.def.id}-${size}`;
  const h = size * 1.1;
  return (
    <View
      style={{
        width: size,
        height: h,
        alignItems: 'center',
        justifyContent: 'center',
        ...(trophy.earned ? { boxShadow: `0px 0px ${Math.round(size / 4)}px ${metal.to}88`, borderRadius: size / 2 } : {}),
      }}
    >
      <Svg width={size} height={h} viewBox="0 0 100 110" style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0.4" y2="1">
            <Stop offset="0" stopColor={metal.from} />
            <Stop offset="0.55" stopColor={metal.to} />
            <Stop offset="1" stopColor={metal.from} stopOpacity={0.85} />
          </LinearGradient>
        </Defs>
        {trophy.earned ? (
          <>
            {/* On light themes a thin outline keeps the pale metal from fading into the page. */}
            <Polygon points={HEX} fill={`url(#${id})`} {...(!c.dark && { stroke: c.outline, strokeWidth: 1 })} />
            <Polygon points={INNER} fill="none" stroke={metal.icon} strokeOpacity={0.35} strokeWidth={1.5} />
          </>
        ) : (
          <>
            <Polygon points={HEX} fill={c.surfaceAlt} stroke={c.border} strokeWidth={2} />
            <Polygon points={INNER} fill="none" stroke={c.border} strokeWidth={1} strokeDasharray="3 4" />
          </>
        )}
      </Svg>
      <AppIcon name={trophy.def.icon} size={Math.round(size * 0.36)} color={trophy.earned ? metal.icon : c.faint} />
      {!trophy.earned && (
        <View style={{ position: 'absolute', bottom: size * 0.06 }}>
          <Lock size={Math.round(size * 0.16)} color={c.faint} strokeWidth={1.75} aria-hidden />
        </View>
      )}
    </View>
  );
}

/** The profile's trophy cabinet; tapping a trophy shows how it is earned and how far along you are. */
export function TrophyCabinet({ trophies }: { trophies: TrophyStatus[] }) {
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
        {sorted.map((t) => (
          <Pressable
            key={t.def.id}
            onPress={() => setOpen(t)}
            style={s.cell}
            accessibilityRole="button"
            accessibilityLabel={`${t.def.name}, ${t.earned ? 'earned' : 'locked'}. ${t.def.description}`}
          >
            <TrophyBadge trophy={t} size={64} />
            <Text style={[s.name, !t.earned && s.nameLocked]} numberOfLines={1}>
              {t.def.name}
            </Text>
            {t.earned ? (
              <Text style={[s.rarity, { color: labelColor(t.def.rarity, c.dark) }]}>{METAL[t.def.rarity].name}</Text>
            ) : (
              <View style={s.miniTrack}>
                <View style={[s.miniFill, { width: `${(t.value / t.def.target) * 100}%` }]} />
              </View>
            )}
          </Pressable>
        ))}
      </View>

      <Modal visible={!!open} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(null)} accessibilityLabel="Close" />
        {open && (
          <View style={s.sheetWrap} pointerEvents="box-none">
            <View style={s.sheet}>
              <TrophyBadge trophy={open} size={120} />
              <Text style={[s.rarity, { color: labelColor(open.def.rarity, c.dark) }]}>{METAL[open.def.rarity].name} trophy</Text>
              <Text style={s.title}>{open.def.name}</Text>
              <Text style={s.desc}>{open.def.description}</Text>
              <View style={s.track}>
                <View style={[s.fill, { width: `${(open.value / open.def.target) * 100}%` }]} />
              </View>
              <Text style={s.progress}>
                {open.earned
                  ? 'Earned'
                  : `${open.value.toLocaleString()} / ${open.def.target.toLocaleString()} ${open.def.unit}`}
              </Text>
              <Pressable onPress={() => setOpen(null)} style={s.close} accessibilityRole="button">
                <Text style={s.closeText}>Close</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Modal>
    </>
  );
}

const makeStyles = themed((c) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 18 },
  cell: { width: '33.33%', alignItems: 'center', gap: 6 },
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
  close: { alignSelf: 'stretch', minHeight: 46, marginTop: 8, borderRadius: c.radius, borderWidth: 1, borderColor: c.outline, alignItems: 'center', justifyContent: 'center' },
  closeText: { ...eyebrow(c, 12), fontWeight: '700', color: c.text },
}));
