import { Component, useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { t } from '../i18n';
import { launchCheck } from '../launchCheck';
import { reportCrash } from '../crashReports';

/**
 * When something breaks, the app shows what went wrong instead of closing,
 * so it can be read out (or screenshotted) and fixed. Kept plain on purpose:
 * no theme, fonts or animation, as those may be what broke.
 */

type Listener = (error: unknown) => void;
const listeners = new Set<Listener>();

/**
 * Errors outside drawing (a timer, a saved game that fails to load) would
 * close the app on a phone. This catches the fatal ones and shows them on
 * the crash screen instead; the rest go on to the usual handler.
 */
export function catchFatalErrors(): void {
  const utils = (globalThis as { ErrorUtils?: { getGlobalHandler: () => (e: unknown, fatal?: boolean) => void; setGlobalHandler: (h: (e: unknown, fatal?: boolean) => void) => void } }).ErrorUtils;
  if (!utils) return;
  const usual = utils.getGlobalHandler();
  utils.setGlobalHandler((error, fatal) => {
    if (fatal && listeners.size) {
      reportCrash(error);
      listeners.forEach((l) => l(error));
    }
    else usual(error, fatal);
  });
}

function describe(error: unknown): string {
  // Errors from another part of the phone may not be this app's Error class, so look at the shape.
  if (error && typeof error === 'object' && 'message' in error) {
    const e = error as { name?: string; message?: string; stack?: string };
    return `${e.name ?? 'Error'}: ${e.message}\n\n${(e.stack ?? '').split('\n').slice(0, 8).join('\n')}`;
  }
  return String(error);
}

export class CrashGuard extends Component<{ children: ReactNode }, { error: unknown }> {
  state = { error: undefined as unknown };

  static getDerivedStateFromError(error: unknown) {
    return { error: error ?? 'Unknown error' };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string | null }) {
    console.warn('Crash screen', error, info.componentStack);
    reportCrash(error);
  }

  render() {
    if (this.state.error !== undefined) return <CrashScreen error={this.state.error} onRetry={() => this.setState({ error: undefined })} />;
    return <FatalListener>{this.props.children}</FatalListener>;
  }
}

/** Swaps in the crash screen when a fatal error happens outside drawing. */
function FatalListener({ children }: { children: ReactNode }) {
  const [error, setError] = useState<unknown>(undefined);
  useEffect(() => {
    const l: Listener = (e) => setError(e ?? 'Unknown error');
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  if (error !== undefined) return <CrashScreen error={error} onRetry={() => setError(undefined)} />;
  return children;
}

export function CrashScreen({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  // The app stayed open and showed the error: no launch report needed next time.
  useEffect(() => launchCheck.ok(), []);
  return (
    <View style={{ flex: 1, backgroundColor: '#12151f', paddingHorizontal: 24, paddingTop: 72, paddingBottom: 32, gap: 16 }}>
      <Text style={{ color: '#eef1fa', fontSize: 22, fontWeight: '700' }} accessibilityRole="header">
        {t('Something went wrong')}
      </Text>
      <Text style={{ color: '#b6bdd2', fontSize: 15, lineHeight: 21 }}>{t('Your progress is saved. Please send a screenshot of this screen so it can be fixed.')}</Text>
      <ScrollView style={{ flex: 1, backgroundColor: '#1b2030', borderRadius: 12 }} contentContainerStyle={{ padding: 12 }}>
        <Text selectable style={{ color: '#ffb3c1', fontSize: 12, lineHeight: 17, fontFamily: 'monospace' }}>
          {describe(error)}
        </Text>
      </ScrollView>
      {onRetry && (
        <Pressable onPress={onRetry} accessibilityRole="button" style={{ alignSelf: 'flex-start', backgroundColor: '#7FD6FF', borderRadius: 999, paddingHorizontal: 20, paddingVertical: 10 }}>
          <Text style={{ color: '#0b0e18', fontSize: 15, fontWeight: '800' }}>{t('Try again')}</Text>
        </Pressable>
      )}
    </View>
  );
}
