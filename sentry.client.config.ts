/**
 * Sentry client-side configuration (Next.js convention).
 * Automatically loaded by @sentry/nextjs in the browser bundle.
 * Guarded by DSN presence — safe to leave unconfigured.
 */
import * as Sentry from "@sentry/nextjs";

const dsn =
  process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
  });
}
