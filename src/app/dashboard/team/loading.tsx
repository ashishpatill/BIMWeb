export default function TeamLoading() {
  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Header + button skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="h-8 w-44 animate-pulse rounded-lg bg-zinc-800" />
          <div className="h-4 w-72 animate-pulse rounded-lg bg-zinc-800/60" />
        </div>
        <div className="h-12 w-40 animate-pulse rounded-xl bg-zinc-800" />
      </div>

      {/* Team cards grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-panel rounded-2xl border border-white/5 p-6">
            <div className="mb-4 flex items-center gap-4">
              <div className="h-10 w-10 animate-pulse rounded-full bg-zinc-800" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-36 animate-pulse rounded bg-zinc-800" />
                <div className="h-3 w-24 animate-pulse rounded bg-zinc-800/60" />
              </div>
              <div className="h-6 w-6 animate-pulse rounded-lg bg-zinc-800" />
            </div>
            <div className="space-y-2 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between">
                <div className="h-3 w-24 animate-pulse rounded bg-zinc-800/60" />
                <div className="h-3 w-28 animate-pulse rounded bg-zinc-800" />
              </div>
              <div className="flex items-center justify-between">
                <div className="h-3 w-16 animate-pulse rounded bg-zinc-800/60" />
                <div className="h-3 w-20 animate-pulse rounded bg-zinc-800" />
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="h-3 w-20 animate-pulse rounded bg-zinc-800/40" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
