import * as Sentry from "@sentry/nextjs";

// Sin DSN el SDK queda deshabilitado (no rompe build ni runtime).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  debug: false,
});
