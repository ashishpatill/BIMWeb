interface Posthog {
  capture(event: string, properties?: Record<string, unknown>): void
  identify(userId: string, traits?: Record<string, unknown>): void
}

interface Window {
  posthog?: Posthog
}
