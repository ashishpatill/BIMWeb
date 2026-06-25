/**
 * Client-side analytics tracking via PostHog.
 */

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return

  try {
    if (typeof window.posthog !== "undefined") {
      window.posthog.capture(event, properties)
    }
  } catch {
    // Analytics should never break the app
  }
}

export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  if (typeof window === "undefined") return

  try {
    if (typeof window.posthog !== "undefined") {
      window.posthog.identify(userId, traits)
    }
  } catch {
    // Analytics should never break the app
  }
}
