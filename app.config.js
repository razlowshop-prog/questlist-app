// Adds to app.json what depends on the build's settings on expo.dev.
//
// Crash reports (Sentry, 2026-11-01): with EXPO_PUBLIC_SENTRY_DSN set for the
// build, Sentry also starts in Android's own code, before the app's code,
// so even a crash in the first moment of opening is reported. Source maps are
// not uploaded (that would need a Sentry login during the build).
module.exports = ({ config }) => {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  return {
    ...config,
    plugins: [
      ...config.plugins,
      [
        '@sentry/react-native',
        {
          disableAutoUpload: true,
          useNativeInit: !!dsn,
          ...(dsn && { options: { dsn, sendDefaultPii: false, environment: process.env.EXPO_PUBLIC_DEV_TOOLS === '1' ? 'test' : 'production' } }),
        },
      ],
    ],
  };
};
