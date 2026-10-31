import { Backpack, ChevronLeft } from 'lucide-react-native';
import { useTourTarget } from './TourTargets';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { APP_NAME } from '../brand';
import { t, tn } from '../i18n';
import { FONTS, themed, useStyles, useTheme } from '../theme';
import { BRAND, brandLine } from '../vivid';
import { Avatar } from './ProfileFrame';
import { CountBadge, fill, GradientText } from './Vivid';

/** Avatar size in the header and the ring around it. */
const RING = 34;
const STROKE = 3;
/** The bag is a warm amber sticker, so it stands out from the grey icons. */
const BAG = ['#FFC94D', '#FF7A1A'];

/**
 * The header on the tab screens (navigation A): the wordmark in the middle,
 * then the bag for the inventory and the avatar for the profile on the right.
 * The ring round the avatar fills with the XP towards the next level; the
 * level itself is on the XP strip just below.
 */
export function TopBar({
  level,
  progress,
  initials,
  bagCount,
  toClaim,
  newLooks = 0,
  onHome,
  onInventory,
  onProfile,
}: {
  level: number;
  /** 0 to 1: XP into this level. */
  progress: number;
  initials: string;
  /** New in the bag since it was last opened, plus new looks to wear from it. */
  bagCount: number;
  /** Trophy tiers ready to claim on the profile. */
  toClaim: number;
  /** Frames and titles won but not seen yet on the profile. */
  newLooks?: number;
  /** The wordmark goes back to Today. */
  onHome: () => void;
  onInventory: () => void;
  onProfile: () => void;
}) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const bagRef = useTourTarget('bag');
  const profileRef = useTourTarget('profile');
  const r = (RING - STROKE) / 2;
  const length = 2 * Math.PI * r;
  const shown = Math.min(1, Math.max(0, progress));

  return (
    <View style={s.bar}>
      <View style={s.middle} pointerEvents="box-none">
        <Pressable onPress={onHome} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('{app}, go to Today', { app: APP_NAME })}>
          <GradientText style={s.wordmark} numberOfLines={1}>
            {APP_NAME.toUpperCase()}
          </GradientText>
        </Pressable>
      </View>
      <View style={{ flex: 1 }} />
      <Pressable
        ref={bagRef}
        onPress={onInventory}
        style={s.icon}
        accessibilityRole="button"
        accessibilityLabel={bagCount ? t('Inventory, {n} new', { n: bagCount }) : t('Inventory')}
      >
        <View style={[s.bag, fill(BAG, 145)]}>
          <Backpack size={18} color="#FFFFFF" strokeWidth={2} aria-hidden />
        </View>
        <CountBadge count={bagCount} style={s.badge} />
      </Pressable>
      <Pressable
        ref={profileRef}
        onPress={onProfile}
        style={s.avatarHit}
        accessibilityRole="button"
        accessibilityLabel={`${t('Profile, level {n}, {pct}% to the next level', { n: level, pct: Math.round(shown * 100) })}${toClaim ? `, ${t('{n} to claim', { n: toClaim })}` : ''}${newLooks ? `, ${tn(newLooks, '{n} new look', '{n} new looks')}` : ''}`}
      >
        <View style={s.ring}>
          <Svg width={RING} height={RING} style={s.ringSvg}>
            <Circle cx={RING / 2} cy={RING / 2} r={r} stroke={c.surfaceAlt} strokeWidth={STROKE} fill="none" />
            {shown > 0 && (
              <Circle
                cx={RING / 2}
                cy={RING / 2}
                r={r}
                stroke={c.brand?.line ?? BRAND.c1}
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
        </View>
        <CountBadge count={toClaim + newLooks} style={s.claim} />
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
      <Pressable onPress={onBack} hitSlop={8} style={s.back} accessibilityRole="button" accessibilityLabel={t('Back to {page}', { page: backTo })}>
        <ChevronLeft size={22} color={brandLine(c)} strokeWidth={2} aria-hidden />
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
  bag: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 0, right: -2 },
  avatarHit: { marginLeft: 4, padding: 3, zIndex: 1 },
  ring: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  ringSvg: { position: 'absolute', left: 0, top: 0 },
  claim: { position: 'absolute', top: -4, right: -4 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 40, paddingRight: 8, zIndex: 1 },
  backText: { color: brandLine(c), fontSize: 16, fontWeight: '700' },
  title: { fontFamily: FONTS.serif, color: c.text, fontSize: 20, maxWidth: '55%' },
}));
