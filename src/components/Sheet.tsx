import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { card, eyebrow, FONTS, headingCase, themed, useStyles } from '../theme';
import { VividButton } from './Vivid';

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
      <SafeAreaView style={s.wrap} pointerEvents="box-none">
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
      </SafeAreaView>
    </Modal>
  );
}

/**
 * "Are you sure?" before a step a slip of the finger shouldn't take, like
 * removing a task. Cancel, the backdrop and the back button all keep things as they are.
 */
export function ConfirmSheet({
  visible,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const s = useStyles(makeStyles);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={s.backdrop} onPress={onCancel} accessibilityLabel="Cancel" />
      <SafeAreaView style={s.wrap} pointerEvents="box-none">
        <View style={[s.sheet, s.confirm]} accessibilityViewIsModal>
          <Text style={s.title} accessibilityRole="header">
            {title}
          </Text>
          {body ? <Text style={s.body}>{body}</Text> : null}
          <View style={s.buttons}>
            <VividButton label="Cancel" kind="secondary" compact onPress={onCancel} style={{ flex: 1 }} />
            <VividButton label={confirmLabel} compact onPress={onConfirm} style={{ flex: 1 }} />
          </View>
        </View>
      </SafeAreaView>
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
  confirm: { maxWidth: 360, gap: 10 },
  body: { color: c.muted, fontSize: 15, lineHeight: 21 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 6 },
}));
