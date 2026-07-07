/**
 * Client-side analytics — deferred until PostHog is configured in production.
 * Server-side optional capture lives in ./server.ts when NEXT_PUBLIC_POSTHOG_KEY is set.
 */

export function trackEvent(_event: string, _properties?: Record<string, unknown>) {
  // no-op (analytics deferred)
}

export function identifyUser(_userId: string, _traits?: Record<string, unknown>) {
  // no-op (analytics deferred)
}
