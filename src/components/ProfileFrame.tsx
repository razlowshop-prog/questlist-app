import {
  BookOpen,
  Clover,
  Coffee,
  Flower,
  Gift,
  Heart,
  Leaf,
  Palette,
  Snowflake,
  Sprout,
  Sun,
  Waves,
  type LucideIcon,
} from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Polygon, Stop } from 'react-native-svg';
import { SEASONS, type FrameId, type SeasonIcon } from '../cosmetics';
import { useTheme } from '../theme';
import { FIRE_COLORS } from './Fire';

export const SEASON_ICONS: Record<SeasonIcon, LucideIcon> = {
  Snowflake,
  Heart,
  Clover,
  Flower,
  Sprout,
  Sun,
  Waves,
  Palette,
  BookOpen,
  Leaf,
  Coffee,
  Gift,
};

/**
 * A frame around the profile picture. The picture (children) is `size` wide;
 * the frame needs a little room around it, so the whole thing is 1.3x size.
 * Without a frame only the picture is drawn, at its own size.
 * Seasonal frames ("season-2026-10") are a ring with that month's emblem on top.
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
  const c = useTheme();
  if (!frame) return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>{children}</View>;
  const box = size * 1.3;
  const color = locked ? c.faint : c.accent;
  const id = `frame-${frame}-${Math.round(size)}`;
  const season = /^season-\d{4}-(\d{2})$/.exec(frame);
  if (season) {
    const Icon = SEASON_ICONS[SEASONS[Number(season[1]) - 1].icon];
    const badge = box * 0.26;
    return (
      <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={box} height={box} viewBox="0 0 130 130" style={{ position: 'absolute' }}>
          {ring(56, color, 2.5)}
          {ring(61, color, 0.8)}
        </Svg>
        {children}
        <View
          style={{
            position: 'absolute',
            top: box * 0.5 - box * (58.5 / 130) - badge / 2,
            width: badge,
            height: badge,
            borderRadius: badge / 2,
            backgroundColor: c.bg,
            borderWidth: 1.5,
            borderColor: color,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={badge * 0.58} color={color} strokeWidth={1.75} aria-hidden />
        </View>
      </View>
    );
  }
  return (
    <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={box} height={box} viewBox="0 0 130 130" style={{ position: 'absolute' }}>
        {frame === 'ember' && (
          <Defs>
            <LinearGradient id={id} x1="0" y1="1" x2="1" y2="0">
              <Stop offset="0" stopColor={locked ? c.faint : FIRE_COLORS[c.dark ? 'dark' : 'light'][1]} />
              <Stop offset="1" stopColor={color} />
            </LinearGradient>
          </Defs>
        )}
        <FrameShape frame={frame as FrameId} color={color} gradient={`url(#${id})`} />
      </Svg>
      {children}
    </View>
  );
}

const ring = (r: number, color: string, w: number) => <Circle cx={65} cy={65} r={r} fill="none" stroke={color} strokeWidth={w} />;
const around = (n: number, from = 0, to = 360) =>
  Array.from({ length: n }, (_, i) => ((from + ((to - from) * i) / (to - from === 360 ? n : n - 1)) * Math.PI) / 180);

function FrameShape({ frame, color, gradient }: { frame: FrameId; color: string; gradient: string }) {
  switch (frame) {
    case 'ring':
      return ring(56, color, 4);
    case 'double':
      return (
        <G>
          {ring(55, color, 2)}
          {ring(61, color, 1.2)}
        </G>
      );
    case 'dotted':
      return (
        <G>
          {around(24).map((a, i) => (
            <Circle key={i} cx={65 + 58 * Math.cos(a)} cy={65 + 58 * Math.sin(a)} r={2.6} fill={color} />
          ))}
        </G>
      );
    case 'hex':
      return (
        <Polygon
          points={around(6, -90).map((a) => `${65 + 62 * Math.cos(a)},${65 + 62 * Math.sin(a)}`).join(' ')}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinejoin="round"
        />
      );
    case 'rays':
      return (
        <G>
          {ring(55, color, 2)}
          {around(16).map((a, i) => (
            <Line
              key={i}
              x1={65 + 59 * Math.cos(a)}
              y1={65 + 59 * Math.sin(a)}
              x2={65 + (i % 2 ? 63 : 65) * Math.cos(a)}
              y2={65 + (i % 2 ? 63 : 65) * Math.sin(a)}
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
            />
          ))}
        </G>
      );
    case 'laurel':
      // Two branches of leaves up the sides, open at the top.
      return (
        <G>
          {[...around(7, 110, 230), ...around(7, -50, 70)].map((a, i) => (
            <Ellipse
              key={i}
              cx={65 + 58 * Math.cos(a)}
              cy={65 + 58 * Math.sin(a)}
              rx={6}
              ry={2.6}
              fill={color}
              transform={`rotate(${(a * 180) / Math.PI + 90 + (i < 7 ? -25 : 25)} ${65 + 58 * Math.cos(a)} ${65 + 58 * Math.sin(a)})`}
            />
          ))}
        </G>
      );
    case 'stars':
      return (
        <G>
          {ring(55, color, 1.5)}
          {around(5, -150, -30).map((a, i) => {
            const x = 65 + 61 * Math.cos(a);
            const y = 65 + 61 * Math.sin(a);
            const r = i === 2 ? 6 : 4.5;
            return <Path key={i} d={sparkle(x, y, r)} fill={color} />;
          })}
        </G>
      );
    case 'diamond':
      return (
        <G>
          <Polygon points="65,2 128,65 65,128 2,65" fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
          <Polygon points="65,10 120,65 65,120 10,65" fill="none" stroke={color} strokeWidth={1} opacity={0.6} />
        </G>
      );
    case 'ember':
      return <Circle cx={65} cy={65} r={56} fill="none" stroke={gradient} strokeWidth={5} />;
    case 'crown':
      return (
        <G>
          {ring(55, color, 3)}
          <Path d="M46 16 L52 2 L59 11 L65 0 L71 11 L78 2 L84 16 Z" fill={color} />
        </G>
      );
  }
}

/** A four-pointed sparkle centred on x, y. */
function sparkle(x: number, y: number, r: number): string {
  const k = r * 0.28;
  return `M${x} ${y - r} L${x + k} ${y - k} L${x + r} ${y} L${x + k} ${y + k} L${x} ${y + r} L${x - k} ${y + k} L${x - r} ${y} L${x - k} ${y - k} Z`;
}
