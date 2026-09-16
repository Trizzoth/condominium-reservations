import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {/* config options here */};

export default withSentryConfig(nextConfig, {
  // Org/proyecto solo se usan para subir sourcemaps (deshabilitado por ahora:
  // requiere SENTRY_AUTH_TOKEN; sin eso igual se capturan errores).
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  sourcemaps: { disable: true },
});
