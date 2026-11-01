import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { restartIntoUpdate, type UpdatePhase } from '../appUpdate';
import { t } from '../i18n';
import { CHECK_WAIT_MS } from '../loading';
import { eyebrow, themed, useStyles, useTheme } from '../theme';
import { Bizzy } from './Bizzy';
import { LoadingBar } from './LoadingBar';

type Update = { phase: UpdatePhase; progress?: number };

/**
 * Whether the app is still waiting at start for the update check: true until
 * the check is done (or has taken CHECK_WAIT_MS, e.g. with no internet), then
 * false for good. A found update keeps the update screen up on its own.
 */
export function useStartCheck(update: Update): boolean {
  const [waiting, setWaiting] = useState(update.phase === 'checking');
  useEffect(() => {
    if (!waiting) return;
    if (update.phase !== 'checking') return setWaiting(false);
    const id = setTimeout(() => setWaiting(false), CHECK_WAIT_MS);
    return () => clearTimeout(id);
  }, [update.phase, waiting]);
  return waiting;
}

/**
 * Covers the app at start while it looks for an update and, if there is one,
 * while it downloads (with its progress); then the new version starts behind a
 * screen of the same colour, so you only ever see one loading screen (asked
 * 2026-11-01). The first open of the day shows this inside the quote screen.
 */
export function UpdateSplash({ update }: { update: Update }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const restarting = useRef(false);
  useEffect(() => {
    if (update.phase !== 'ready' || restarting.current) return;
    restarting.current = true;
    // A moment to see the bar full.
    const id = setTimeout(() => restartIntoUpdate(c.bg), 600);
    return () => clearTimeout(id);
  }, [update.phase]);
  const found = update.phase === 'downloading' || update.phase === 'ready';
  return (
    <Animated.View exiting={FadeOut.duration(250)} style={[StyleSheet.absoluteFill, s.screen]} accessibilityViewIsModal>
      <Bizzy size={96} mood="excited" motion="bob" />
      <Text style={s.title}>{found ? t('New version') : t('Looking for updates')}</Text>
      <View style={s.bar}>
        <LoadingBar phase={update.phase} download={update.progress} />
      </View>
    </Animated.View>
  );
}

const makeStyles = themed((c) => ({
  screen: { backgroundColor: c.bg, zIndex: 61, alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: 40 },
  title: { ...eyebrow(c, 11), color: c.muted },
  bar: { alignSelf: 'stretch', maxWidth: 360, width: '100%' },
}));
