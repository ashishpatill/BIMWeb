/**
 * Next.js App Router instrumentation hook.
 * Initializes Sentry for server-side error tracking when DSN is configured.
 * Must not throw if SENTRY_DSN is absent.
 */
export async function register() {
  if (!process.env.SENTRY_DSN) return;

  if (
    process.env.NEXT_RUNTIME === "nodejs" ||
    process.env.NEXT_RUNTIME === "edge"
  ) {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV,
    });
  }
}
