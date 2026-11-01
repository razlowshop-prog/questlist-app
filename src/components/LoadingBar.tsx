import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import type { UpdatePhase } from '../appUpdate';
import { t } from '../i18n';
import { loadingView, sillyOrder } from '../loading';
import { themed, useStyles } from '../theme';

/**
 * The honey loading bar (picked as the first suggestion, 2026-11-01, style A):
 * a thick bar filling with glossy honey, a silly line under it. Calls `onDone`
 * once, when it's full and nothing is left to wait for.
 */
export function LoadingBar({ phase, download, onDone }: { phase: UpdatePhase; download?: number; onDone?: () => void }) {
  const s = useStyles(makeStyles);
  const [lines] = useState(() => sillyOrder(Math.random()));
  const started = useRef(Date.now());
  const [now, setNow] = useState(started.current);
  const view = loadingView(now - started.current, phase, lines, download);
  const told = useRef(false);

  useEffect(() => {
    if (view.done) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [view.done]);

  useEffect(() => {
    if (view.done && !told.current) {
      told.current = true;
      onDone?.();
    }
  }, [view.done]);

  return (
    <View style={s.wrap} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(view.progress * 100) }} accessibilityLabel={t(view.line)}>
      <View style={s.track}>
        <View style={[s.honey, { width: `${Math.max(6, view.progress * 100)}%` }]}>
          <View style={s.shine} />
        </View>
      </View>
      <Text style={s.line} numberOfLines={2}>
        {t(view.line)}
      </Text>
    </View>
  );
}

const makeStyles = themed((c) => ({
  wrap: { alignSelf: 'stretch', alignItems: 'center', gap: 9 },
  track: { alignSelf: 'stretch', height: 14, borderRadius: 7, backgroundColor: c.dark ? 'rgba(255,255,255,0.08)' : c.border, overflow: 'hidden' },
  honey: { height: '100%', borderRadius: 7, backgroundColor: '#F2B544', backgroundImage: 'linear-gradient(180deg, #FFE08A, #F2B544 55%, #D98A1F)' },
  shine: { position: 'absolute', left: 6, right: 6, top: 2, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.55)' },
  line: { color: c.muted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
}));
