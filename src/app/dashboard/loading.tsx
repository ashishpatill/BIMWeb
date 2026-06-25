export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Header skeleton */}
      <div className="flex flex-col gap-2">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-zinc-800" />
        <div className="h-4 w-80 animate-pulse rounded-lg bg-zinc-800/60" />
      </div>

      {/* Stat cards skeleton — matches 4 cards in dashboard-client */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-panel rounded-2xl border border-white/5 p-6">
            <div className="mb-4 h-10 w-10 animate-pulse rounded-xl bg-zinc-800" />
            <div className="space-y-2">
              <div className="h-8 w-20 animate-pulse rounded bg-zinc-800" />
              <div className="h-4 w-28 animate-pulse rounded bg-zinc-800/60" />
            </div>
            <div className="mt-4 h-3 w-24 animate-pulse rounded bg-zinc-800/40" />
          </div>
        ))}
      </div>

      {/* Activity + quick actions skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel rounded-2xl border border-white/5 p-6 h-96 flex flex-col items-center justify-center gap-4">
          <div className="h-16 w-16 animate-pulse rounded-full bg-zinc-800" />
          <div className="h-6 w-40 animate-pulse rounded bg-zinc-800" />
          <div className="h-4 w-64 animate-pulse rounded bg-zinc-800/60" />
          <div className="mt-2 h-10 w-36 animate-pulse rounded-xl bg-zinc-800" />
        </div>
        <div className="glass-panel rounded-2xl border border-white/5 p-6 h-96 flex flex-col justify-between">
          <div className="flex flex-col gap-3">
            <div className="mb-4 h-6 w-32 animate-pulse rounded bg-zinc-800" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
                <div className="h-8 w-8 animate-pulse rounded-lg bg-zinc-800" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-24 animate-pulse rounded bg-zinc-800" />
                  <div className="h-3 w-36 animate-pulse rounded bg-zinc-800/60" />
                </div>
              </div>
            ))}
          </div>
          <div className="h-3 w-40 animate-pulse self-center rounded bg-zinc-800/40" />
        </div>
      </div>
    </div>
  )
}
