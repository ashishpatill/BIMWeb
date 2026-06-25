/**
 * Server-side analytics tracking.
 */

const POSTHOG_API_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com"

interface ServerEvent {
  event: string
  distinctId: string
  properties?: Record<string, unknown>
}

export async function trackServerEvent({
  event,
  distinctId,
  properties,
}: ServerEvent): Promise<void> {
  if (!POSTHOG_API_KEY) return

  try {
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: POSTHOG_API_KEY,
        event,
        distinct_id: distinctId,
        properties,
      }),
    })
  } catch {
    // Analytics should never break the app
  }
}

export async function getPageViewStats() {
  // Placeholder for dashboard analytics
  return {
    activeUsers: 0,
    totalProjects: 0,
    totalModels: 0,
    pageViews: 0,
  }
}
