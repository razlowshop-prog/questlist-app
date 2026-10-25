import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { card, eyebrow, FONTS, headingCase, themed, useStyles } from '../theme';

/** A centred sheet over a dim backdrop, closed by tapping outside or Done. */
export function Sheet({
  title,
  eyebrow: kicker,
  visible,
  onClose,
  closeLabel = 'Done',
  children,
}: {
  title: string;
  eyebrow?: string;
  visible: boolean;
  onClose: () => void;
  /** The word on the close button, e.g. "Cancel" when closing drops a choice. */
  closeLabel?: string;
  children: ReactNode;
}) {
  const s = useStyles(makeStyles);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={s.wrap} pointerEvents="box-none">
        <View style={s.sheet}>
          <View style={s.head}>
            <View style={{ flex: 1 }}>
              {kicker ? <Text style={s.eyebrow}>{kicker}</Text> : null}
              <Text style={s.title}>{title}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button">
              <Text style={s.done}>{closeLabel}</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = themed((c) => ({
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#000', opacity: 0.55 },
  wrap: { flex: 1, justifyContent: 'center', padding: 20 },
  sheet: { ...card(c), backgroundColor: c.bg, maxWidth: 480, width: '100%', alignSelf: 'center', maxHeight: '88%', padding: 18, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  eyebrow: { ...eyebrow(c, 11), color: c.muted },
  title: { fontFamily: FONTS.serif, color: c.text, fontSize: 24, lineHeight: 30, ...headingCase(c) },
  done: { color: c.accent, fontSize: 15, fontWeight: '700', paddingTop: 4 },
}));
