import * as Sentry from '@sentry/react-native';

let sentryInitialized = false;

export function initializeSentry() {
  if (sentryInitialized) {
    return;
  }

  const dsn = process.env.SENTRY_DSN;

  Sentry.init({
    dsn,
    enabled: Boolean(dsn),
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });

  sentryInitialized = true;
}

export function initializeSentryWithDsn(dsn: string | undefined) {
  if (sentryInitialized) {
    return;
  }

  Sentry.init({
    dsn,
    enabled: Boolean(dsn),
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });

  sentryInitialized = true;
}
