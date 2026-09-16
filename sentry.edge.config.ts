import * as Sentry from "@sentry/nextjs";

// Sin DSN el SDK queda deshabilitado (middleware corre en edge).
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  debug: false,
});
