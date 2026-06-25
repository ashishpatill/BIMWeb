export default function SettingsLoading() {
  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Header skeleton */}
      <div className="flex flex-col gap-2">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-zinc-800" />
        <div className="h-4 w-72 animate-pulse rounded-lg bg-zinc-800/60" />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: profile card skeleton */}
        <div className="lg:col-span-1">
          <div className="glass-panel rounded-2xl border border-white/5 p-6 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-24 w-24 animate-pulse rounded-full bg-zinc-800" />
              <div className="space-y-1.5">
                <div className="h-6 w-36 animate-pulse rounded bg-zinc-800" />
                <div className="h-4 w-48 animate-pulse rounded bg-zinc-800/60" />
              </div>
              <div className="w-full pt-4 border-t border-white/5 mt-2 flex flex-col gap-2.5">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                    <div className="h-3 w-20 animate-pulse rounded bg-zinc-800/60" />
                    <div className="h-3 w-24 animate-pulse rounded bg-zinc-800" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: config sections skeleton */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Account Metadata skeleton */}
          <div className="glass-panel rounded-2xl border border-white/5 p-6">
            <div className="mb-6 flex items-center gap-2">
              <div className="h-5 w-5 animate-pulse rounded bg-zinc-800" />
              <div className="h-6 w-40 animate-pulse rounded bg-zinc-800" />
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-zinc-950/40 border border-white/5 rounded-xl space-y-1">
                  <div className="h-2.5 w-16 animate-pulse rounded bg-zinc-800/40" />
                  <div className="h-4 w-24 animate-pulse rounded bg-zinc-800" />
                </div>
                <div className="p-3 bg-zinc-950/40 border border-white/5 rounded-xl space-y-1">
                  <div className="h-2.5 w-16 animate-pulse rounded bg-zinc-800/40" />
                  <div className="h-4 w-28 animate-pulse rounded bg-zinc-800" />
                </div>
              </div>
              <div className="p-3 bg-zinc-950/40 border border-white/5 rounded-xl space-y-1">
                <div className="h-2.5 w-24 animate-pulse rounded bg-zinc-800/40" />
                <div className="h-4 w-64 animate-pulse rounded bg-zinc-800" />
              </div>
            </div>
          </div>

          {/* Platform Infrastructure skeleton */}
          <div className="glass-panel rounded-2xl border border-white/5 p-6">
            <div className="mb-6 flex items-center gap-2">
              <div className="h-5 w-5 animate-pulse rounded bg-zinc-800" />
              <div className="h-6 w-48 animate-pulse rounded bg-zinc-800" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-zinc-950/40 border border-white/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 animate-pulse rounded-lg bg-zinc-800" />
                    <div className="space-y-1">
                      <div className="h-4 w-28 animate-pulse rounded bg-zinc-800" />
                      <div className="h-3 w-36 animate-pulse rounded bg-zinc-800/60" />
                    </div>
                  </div>
                  <div className="h-6 w-20 animate-pulse rounded-full bg-zinc-800" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
