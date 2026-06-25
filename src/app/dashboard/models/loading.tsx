export default function ModelsLoading() {
  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Header + button skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-zinc-800" />
          <div className="h-4 w-64 animate-pulse rounded-lg bg-zinc-800/60" />
        </div>
        <div className="h-12 w-36 animate-pulse rounded-xl bg-zinc-800" />
      </div>

      {/* Split layout skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left sidebar skeleton */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="h-10 w-full animate-pulse rounded-xl bg-zinc-800" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-panel rounded-xl border border-white/5 p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-zinc-800" />
                  <div className="h-3 w-14 animate-pulse rounded bg-zinc-800/60" />
                </div>
                <div className="mb-3 space-y-1">
                  <div className="h-3 w-full animate-pulse rounded bg-zinc-800/60" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-800/60" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="h-3 w-20 animate-pulse rounded bg-zinc-800/40" />
                  <div className="h-3 w-16 animate-pulse rounded bg-zinc-800/40" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right viewer skeleton */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="glass-panel rounded-2xl border border-white/5 h-[400px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 animate-pulse rounded-full bg-zinc-800" />
              <div className="h-5 w-40 animate-pulse rounded bg-zinc-800" />
            </div>
          </div>
          <div className="glass-panel rounded-2xl border border-white/5 p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="h-6 w-44 animate-pulse rounded bg-zinc-800" />
                <div className="h-3 w-36 animate-pulse rounded bg-zinc-800/60" />
              </div>
              <div className="h-6 w-24 animate-pulse rounded-full bg-zinc-800" />
            </div>
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-zinc-950/40 rounded-xl border border-white/5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <div className="h-2.5 w-16 animate-pulse rounded bg-zinc-800/40" />
                  <div className="h-4 w-20 animate-pulse rounded bg-zinc-800" />
                </div>
              ))}
            </div>
            <div className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
              <div className="h-4 w-4 animate-pulse rounded bg-zinc-800" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-36 animate-pulse rounded bg-zinc-800" />
                <div className="h-3 w-full animate-pulse rounded bg-zinc-800/60" />
                <div className="h-3 w-4/5 animate-pulse rounded bg-zinc-800/60" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
