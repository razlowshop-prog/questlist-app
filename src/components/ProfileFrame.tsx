import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, Image, Platform, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import type { FrameId } from '../cosmetics';
import { nativeDriver } from '../theme';
import { avatarDisc, FRAME_LOOKS, KEYLINE, mixHex, SEASON_FRAME, SEASON_PILL, type FrameArt as FrameArtKind, type FrameLook } from '../vivid';
import { useReduceMotion } from './FireAura';
import { FrameArt } from './FrameArt';
import { fill, useSvgId, VIVID_HEAVY } from './Vivid';

/** The avatar gradient the player picked (Settings.avatar), for every avatar in the app. */
export const AvatarDiscContext = createContext<number | undefined>(undefined);
/** The player's own photo (a data URI), shown instead of the initials disc. */
export const AvatarPhotoContext = createContext<string | undefined>(undefined);

/** The profile picture: white initials on the player's gradient disc, with a dark keyline. */
export function Avatar({ initials, size, disc }: { initials: string; size: number; /** Overrides the picked disc, for the picker. */ disc?: number }) {
  const picked = useContext(AvatarDiscContext);
  const photo = useContext(AvatarPhotoContext);
  const grad = avatarDisc(disc ?? picked);
  // The colour pickers always show discs, even with a photo set.
  if (photo && disc === undefined) {
    return (
      <Image
        source={{ uri: photo }}
        style={{ width: size, height: size, borderRadius: size / 2, borderWidth: size >= 40 ? 2 : 1.5, borderColor: KEYLINE }}
        accessibilityIgnoresInvertColors
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: size >= 40 ? 2 : 1.5,
        borderColor: KEYLINE,
        alignItems: 'center',
        justifyContent: 'center',
        ...fill(grad, 145),
        boxShadow: `0px ${Math.round(size / 14)}px ${Math.round(size / 4)}px ${grad.c2}66, inset 0px 2px 0px rgba(255,255,255,0.35)`,
      }}
    >
      {initials ? (
        <Text style={{ fontFamily: VIVID_HEAVY, color: '#FFFFFF', fontSize: Math.round(size * 0.36), textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } }}>
          {initials}
        </Text>
      ) : null}
    </View>
  );
}

/** How far past its box a frame's drawing reaches (flame tongues, rays, planets), as a share of the box. */
const REACH: Partial<Record<FrameArtKind, number>> = { flames: 0.2, sunrise: 0.14, orbit: 0.08, laurel: 0.08, crystal: 0.05 };

/** Room to leave round a frame of a picture `size` wide so its drawing doesn't run into what's next to it. */
export function frameReach(frame: string | undefined, size: number): number {
  const art = frame ? FRAME_LOOKS[frame as FrameId]?.art : undefined;
  return art ? (REACH[art] ?? 0) * size * 1.3 : 0;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/**
 * A vivid frame around the profile picture (rewards spec): a metal or jewel
 * ring just outside the picture, with a dark keyline. Neon, Inferno and
 * Aurora sweep all the way round and turn slowly. Monthly event frames
 * ("season-2026-10") are the Aurora ring with a month pill.
 * The picture (children) is `size` wide; with a frame the whole thing is 1.3x size.
 */
export function ProfileFrame({
  frame,
  size,
  locked,
  children,
}: {
  frame?: string;
  size: number;
  /** Drawn faint, for frames not won yet. */
  locked?: boolean;
  children?: ReactNode;
}) {
  if (!frame) return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>{children}</View>;
  const season = /^season-\d{4}-(\d{2})$/.exec(frame);
  const look = season ? SEASON_FRAME : FRAME_LOOKS[frame as FrameId];
  if (!look) return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>{children}</View>;
  const box = size * 1.3;
  return (
    <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}>
      {look.art ? (
        <View style={{ position: 'absolute', left: 0, top: 0, width: box, height: box, opacity: locked ? 0.35 : 1 }} pointerEvents="none">
          <FrameArt look={{ ...look, art: look.art }} box={box} locked={locked} />
        </View>
      ) : (
        <Ring look={look} size={size} box={box} locked={locked} blur={!!season} />
      )}
      {children}
      {season && (
        <View
          style={{
            position: 'absolute',
            bottom: box * 0.02,
            paddingHorizontal: Math.max(4, size * 0.08),
            height: Math.max(12, size * 0.2),
            borderRadius: size,
            borderWidth: 1.5,
            borderColor: KEYLINE,
            justifyContent: 'center',
            opacity: locked ? 0.5 : 1,
            ...fill(SEASON_PILL, 90),
          }}
        >
          <Text style={{ fontFamily: VIVID_HEAVY, color: '#FFFFFF', fontSize: Math.max(7, size * 0.12), letterSpacing: 0.5 }}>{MONTHS[Number(season[1]) - 1]}</Text>
        </View>
      )}
    </View>
  );
}

/** The colour at a point (0-1) along a list of stops. */
function colorAt(stops: string[], t: number): string {
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  return mixHex(stops[i], stops[i + 1], x - i);
}

const SEGMENTS = 48;

function Ring({ look, size, box, locked, blur }: { look: FrameLook; size: number; box: number; locked?: boolean; blur?: boolean }) {
  const id = useSvgId('frame');
  const reduce = useReduceMotion();
  const spin = useRef(new Animated.Value(0)).current;
  const spinning = !!look.spin && !locked && !reduce;
  useEffect(() => {
    if (!spinning) return;
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: nativeDriver }));
    loop.start();
    return () => loop.stop();
  }, [spinning]);

  const c = box / 2;
  const t = Math.max(2.5, size * 0.075);
  const gap = Math.max(1.5, size * 0.045);
  const r = size / 2 + gap + t / 2;
  const kl = size >= 60 ? 1.5 : 1;
  const mid = colorAt(look.stops, 0.5);

  const arc = (from: number, to: number) => {
    const a0 = from * Math.PI * 2 - Math.PI / 2;
    const a1 = to * Math.PI * 2 - Math.PI / 2;
    return `M${c + r * Math.cos(a0)} ${c + r * Math.sin(a0)}A${r} ${r} 0 0 1 ${c + r * Math.cos(a1)} ${c + r * Math.sin(a1)}`;
  };

  const ring = (
    <Svg width={box} height={box}>
      {!look.conic && (
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            {look.stops.map((col, i) => (
              <Stop key={i} offset={i / (look.stops.length - 1)} stopColor={col} />
            ))}
          </LinearGradient>
        </Defs>
      )}
      {look.conic ? (
        // A sweep of colours round the ring, as short arcs (SVG has no conic gradient).
        Array.from({ length: SEGMENTS }, (_, i) => (
          <Path key={i} d={arc(i / SEGMENTS, (i + 1.15) / SEGMENTS)} stroke={colorAt(look.stops, (i + 0.5) / SEGMENTS)} strokeWidth={t} fill="none" />
        ))
      ) : (
        <Circle cx={c} cy={c} r={r} stroke={`url(#${id})`} strokeWidth={t} fill="none" />
      )}
      <Circle cx={c} cy={c} r={r + t / 2 + kl / 2} stroke={KEYLINE} strokeWidth={kl} fill="none" />
      <Circle cx={c} cy={c} r={r - t / 2 - kl / 2} stroke={KEYLINE} strokeWidth={kl} fill="none" />
      {/* gloss on the top left */}
      <Path d={arc(0.68, 0.9)} stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={Math.max(1, t * 0.28)} strokeLinecap="round" fill="none" />
    </Svg>
  );

  return (
    <View style={{ position: 'absolute', left: 0, top: 0, width: box, height: box, opacity: locked ? 0.35 : 1 }} pointerEvents="none">
      {(look.glow || blur) && !locked && (
        <View
          style={{
            position: 'absolute',
            left: c - r,
            top: c - r,
            width: r * 2,
            height: r * 2,
            borderRadius: r,
            boxShadow: `0px 0px ${Math.round(size * (blur ? 0.22 : 0.14))}px ${mid}${blur ? 'CC' : '99'}`,
            ...(blur && Platform.OS === 'web' ? ({ filter: 'blur(1px)' } as object) : null),
          }}
        />
      )}
      <Animated.View style={spinning ? { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] } : undefined}>{ring}</Animated.View>
    </View>
  );
}
