import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { restartIntoUpdate, type UpdatePhase } from '../appUpdate';
import { t } from '../i18n';
import { eyebrow, themed, useStyles } from '../theme';
import { Bizzy } from './Bizzy';
import { LoadingBar } from './LoadingBar';

/**
 * When the app opens without the quote and finds an update, this covers it
 * while the update downloads, then restarts into the new version, so you see
 * when an update arrives (asked 2026-11-01).
 */
export function UpdateSplash({ update }: { update: { phase: UpdatePhase; progress?: number } }) {
  const s = useStyles(makeStyles);
  useEffect(() => {
    if (update.phase !== 'ready') return;
    const id = setTimeout(restartIntoUpdate, 900);
    return () => clearTimeout(id);
  }, [update.phase]);
  return (
    <View style={[StyleSheet.absoluteFill, s.screen]} accessibilityViewIsModal>
      <Bizzy size={96} mood="excited" motion="bob" />
      <Text style={s.title}>{t('New version')}</Text>
      <View style={s.bar}>
        <LoadingBar phase={update.phase} download={update.progress} />
      </View>
    </View>
  );
}

const makeStyles = themed((c) => ({
  screen: { backgroundColor: c.bg, zIndex: 61, alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: 40 },
  title: { ...eyebrow(c, 11), color: c.muted },
  bar: { alignSelf: 'stretch', maxWidth: 360, width: '100%' },
}));
