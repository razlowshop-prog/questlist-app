import { Backpack, ChevronLeft } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { APP_NAME } from '../brand';
import { FONTS, themed, useStyles, useTheme } from '../theme';
import { BRAND, brandLine, KEYLINE } from '../vivid';
import { Avatar } from './ProfileFrame';
import { CountBadge, fill, GradientText, VIVID_HEAVY } from './Vivid';

/** Avatar size in the header and the ring around it. */
const RING = 34;
const STROKE = 3;

/**
 * The header on the tab screens (navigation A): the wordmark in the middle,
 * then the bag for the inventory and the avatar for the profile on the right.
 * The ring round the avatar fills with the XP towards the next level.
 */
export function TopBar({
  level,
  progress,
  initials,
  bagCount,
  toClaim,
  onInventory,
  onProfile,
}: {
  level: number;
  /** 0 to 1: XP into this level. */
  progress: number;
  initials: string;
  /** Tokens held, shown small on the bag. */
  bagCount: number;
  /** Trophy tiers ready to claim on the profile. */
  toClaim: number;
  onInventory: () => void;
  onProfile: () => void;
}) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const r = (RING - STROKE) / 2;
  const length = 2 * Math.PI * r;
  const shown = Math.min(1, Math.max(0, progress));

  return (
    <View style={s.bar}>
      <View style={s.middle} pointerEvents="none">
        <GradientText style={s.wordmark} numberOfLines={1}>
          {APP_NAME.toUpperCase()}
        </GradientText>
      </View>
      <View style={{ flex: 1 }} />
      <Pressable
        onPress={onInventory}
        style={s.icon}
        accessibilityRole="button"
        accessibilityLabel={`Inventory${bagCount ? `, ${bagCount} tokens` : ''}`}
      >
        <Backpack size={22} color={c.muted} strokeWidth={1.6} aria-hidden />
        <CountBadge count={bagCount} style={s.badge} />
      </Pressable>
      <Pressable
        onPress={onProfile}
        style={s.avatarHit}
        accessibilityRole="button"
        accessibilityLabel={`Profile, level ${level}, ${Math.round(shown * 100)}% to the next level${toClaim ? `, ${toClaim} to claim` : ''}`}
      >
        <View style={s.ring}>
          <Svg width={RING} height={RING} style={s.ringSvg}>
            <Circle cx={RING / 2} cy={RING / 2} r={r} stroke={c.surfaceAlt} strokeWidth={STROKE} fill="none" />
            {shown > 0 && (
              <Circle
                cx={RING / 2}
                cy={RING / 2}
                r={r}
                stroke={BRAND.c1}
                strokeWidth={STROKE}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${length * shown} ${length}`}
                // Starts at the top and runs clockwise.
                transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
              />
            )}
          </Svg>
          <Avatar initials={initials.slice(0, 1)} size={RING - 2 * STROKE - 2} />
          <View style={[s.level, fill(BRAND, 135)]}>
            <Text style={s.levelText}>{level}</Text>
          </View>
        </View>
        <CountBadge count={toClaim} style={s.claim} />
      </Pressable>
    </View>
  );
}

/** Replaces the header on pages (Profile, Inventory, every Menu entry): back to the tab it came from, and the page's name. */
export function BackBar({ backTo, title, onBack }: { backTo: string; title: string; onBack: () => void }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  return (
    <View style={s.bar}>
      <Pressable onPress={onBack} hitSlop={8} style={s.back} accessibilityRole="button" accessibilityLabel={`Back to ${backTo}`}>
        <ChevronLeft size={22} color={brandLine(c.dark)} strokeWidth={2} aria-hidden />
        <Text style={s.backText}>{backTo}</Text>
      </Pressable>
      <View style={s.middle} pointerEvents="none">
        <Text style={s.title} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
      </View>
    </View>
  );
}

const makeStyles = themed((c) => ({
  bar: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, maxWidth: 664, width: '100%', alignSelf: 'center' },
  // The wordmark and page title sit in the true middle, whatever is on either side.
  middle: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  wordmark: { fontFamily: FONTS.serif, fontSize: 21, letterSpacing: 4.6 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  badge: { position: 'absolute', top: 0, right: -2 },
  avatarHit: { marginLeft: 4, padding: 3, zIndex: 1 },
  ring: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  ringSvg: { position: 'absolute', left: 0, top: 0 },
  level: {
    position: 'absolute',
    right: -5,
    bottom: -4,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 3,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: KEYLINE,
  },
  levelText: { color: '#FFFFFF', fontFamily: VIVID_HEAVY, fontSize: 10, lineHeight: 12 },
  claim: { position: 'absolute', top: -4, right: -4 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 40, paddingRight: 8, zIndex: 1 },
  backText: { color: brandLine(c.dark), fontSize: 16, fontWeight: '700' },
  title: { fontFamily: FONTS.serif, color: c.text, fontSize: 20, maxWidth: '55%' },
}));
