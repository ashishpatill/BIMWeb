export default function ProjectsLoading() {
  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Header + button skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="h-8 w-32 animate-pulse rounded-lg bg-zinc-800" />
          <div className="h-4 w-64 animate-pulse rounded-lg bg-zinc-800/60" />
        </div>
        <div className="h-12 w-36 animate-pulse rounded-xl bg-zinc-800" />
      </div>

      {/* Search bar skeleton */}
      <div className="relative max-w-md w-full">
        <div className="h-11 w-full animate-pulse rounded-xl bg-zinc-800" />
      </div>

      {/* Projects grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-panel rounded-2xl border border-white/5 p-6 h-56 flex flex-col justify-between">
            <div>
              <div className="mb-4 flex items-start justify-between">
                <div className="h-10 w-10 animate-pulse rounded-xl bg-zinc-800" />
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-16 animate-pulse rounded-full bg-zinc-800" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-6 w-36 animate-pulse rounded bg-zinc-800" />
                <div className="h-4 w-full animate-pulse rounded bg-zinc-800/60" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800/60" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="h-4 w-24 animate-pulse rounded bg-zinc-800/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
