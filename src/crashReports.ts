import * as Sentry from '@sentry/react-native';

/**
 * Crash reports (set up 2026-11-01): when the app breaks on a phone, Sentry
 * sends the error and where it happened, so it can be fixed without guessing.
 * Only with a Sentry address (EXPO_PUBLIC_SENTRY_DSN, set on expo.dev for the
 * builds); without one nothing is sent. No names, tasks or other personal data.
 */
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function startCrashReports(): void {
  if (!dsn) return;
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    environment: __DEV__ ? 'development' : process.env.EXPO_PUBLIC_DEV_TOOLS === '1' ? 'test' : 'production',
    tracesSampleRate: 0,
  });
}

/** An error the crash screen caught (so Sentry's own handler never saw it). */
export function reportCrash(error: unknown): void {
  if (dsn) Sentry.captureException(error);
}
