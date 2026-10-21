import { Text, View, type TextStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { type Ornament, useTheme } from '../theme';
import { BrassRule } from './BrassRule';

/**
 * The SUCCEDO wordmark dressed for the current theme: the rule with diamond
 * ends (or a double line), or a small drawing in front of it.
 * `ruleWidth` undefined = the rules stretch to fill the row.
 */
export function LogoMark({ textStyle, ruleWidth }: { textStyle: TextStyle; ruleWidth?: number }) {
  const c = useTheme();
  const rule = ruleWidth ? { width: ruleWidth } : { flex: 1 };
  const word = <Text style={textStyle}>SUCCEDO</Text>;

  if (c.logoRule && c.ornament === 'double') {
    return (
      <>
        <DoubleRule color={c.accent} style={rule} />
        {word}
        <DoubleRule color={c.accent} style={rule} />
      </>
    );
  }
  if (c.logoRule) {
    return (
      <>
        <BrassRule end="left" style={rule} />
        {word}
        <BrassRule end="right" style={rule} />
      </>
    );
  }
  return (
    <>
      {c.ornament !== 'none' && <OrnamentIcon kind={c.ornament} color={c.accent} />}
      {word}
    </>
  );
}

function DoubleRule({ color, style }: { color: string; style: { width: number } | { flex: number } }) {
  return (
    <View style={[{ height: 5, justifyContent: 'space-between' }, style]} aria-hidden>
      <View style={{ height: 1, backgroundColor: color }} />
      <View style={{ height: 1, backgroundColor: color }} />
    </View>
  );
}

/** Line drawings, about 28 px wide, 1.5 px stroke. */
export function OrnamentIcon({ kind, color }: { kind: Ornament; color: string }) {
  const stroke = { stroke: color, strokeWidth: 1.5, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={28} height={18} viewBox="0 0 28 18" aria-hidden>
      {kind === 'leaf' && (
        <>
          <Path d="M4 15C6 6 14 2 24 3c-1 9-7 13-15 12" {...stroke} />
          <Path d="M4 15l12-8" {...stroke} />
        </>
      )}
      {kind === 'wave' && <Path d="M2 10c3-4 5-4 8 0s5 4 8 0 5-4 8 0" {...stroke} />}
      {kind === 'sun' && (
        <>
          <Path d="M2 14h24" {...stroke} />
          <Path d="M8 14a6 6 0 0 1 12 0" {...stroke} />
          <Path d="M14 3v2.5M6.5 6.5l1.6 1.6M21.5 6.5l-1.6 1.6" {...stroke} />
        </>
      )}
      {kind === 'bolt' && <Path d="M3 12l6-6 5 5 5-6 6 6" {...stroke} />}
      {kind === 'peak' && <Path d="M2 15l8-10 5 6 3-3 8 7" {...stroke} />}
      {kind === 'dots' && (
        <>
          <Circle cx={6} cy={9} r={1.5} fill={color} opacity={0.45} />
          <Circle cx={13} cy={9} r={2.2} fill={color} opacity={0.7} />
          <Circle cx={21} cy={9} r={3} fill={color} />
        </>
      )}
      {kind === 'double' && (
        <>
          <Path d="M2 7.5h24" {...stroke} strokeWidth={1} />
          <Path d="M2 10.5h24" {...stroke} strokeWidth={1} />
        </>
      )}
      {kind === 'moon' && (
        <>
          <Path d="M13 3.5a6 6 0 1 0 6 8.5 5 5 0 0 1-6-8.5z" {...stroke} />
          <Circle cx={22} cy={4} r={1} fill={color} />
          <Circle cx={25} cy={9} r={0.8} fill={color} />
        </>
      )}
    </Svg>
  );
}
