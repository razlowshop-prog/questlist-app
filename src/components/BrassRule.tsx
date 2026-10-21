import { View, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';

/**
 * The brass line with a diamond end from the logo (in the theme's accent). `end` says where the
 * diamond sits; give it a width or flex through `style`.
 */
export function BrassRule({ end = 'left', style }: { end?: 'left' | 'right' | 'both'; style?: ViewStyle }) {
  const color = useTheme().accent;
  return (
    <View style={[{ height: 1.5, backgroundColor: color, justifyContent: 'center' }, style]} aria-hidden>
      {(end === 'left' || end === 'both') && <Diamond side="left" color={color} />}
      {(end === 'right' || end === 'both') && <Diamond side="right" color={color} />}
    </View>
  );
}

function Diamond({ side, color }: { side: 'left' | 'right'; color: string }) {
  return (
    <View
      style={{
        position: 'absolute',
        [side]: -3,
        width: 6,
        height: 6,
        backgroundColor: color,
        transform: [{ rotate: '45deg' }],
      }}
    />
  );
}
