import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function DocumentsLoading() {
  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* PageHeader skeleton */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center gap-1 text-xs text-zinc-600">
          <Skeleton className="h-3 w-16 bg-white/5" />
          <span>/</span>
          <Skeleton className="h-3 w-20 bg-white/5" />
        </div>
        <Skeleton className="h-7 w-36 bg-white/5" />
        <Skeleton className="h-4 w-72 bg-white/5" />
      </div>

      {/* Dropzone skeleton */}
      <Card className="border-white/5 bg-white/[0.02]">
        <CardContent className="p-0">
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/10 p-10">
            <Skeleton className="mb-3 size-10 rounded-full bg-white/5" />
            <Skeleton className="mb-1 h-4 w-48 bg-white/5" />
            <Skeleton className="h-3 w-56 bg-white/5" />
          </div>
        </CardContent>
      </Card>

      {/* Pipeline status skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-32 bg-white/5" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="glass-panel flex items-center justify-between rounded-xl border border-white/5 p-4"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="size-5 rounded bg-white/5" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-40 bg-white/5" />
                <Skeleton className="h-3 w-24 bg-white/5" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="size-6 rounded-full bg-white/5" />
              <Skeleton className="size-6 rounded-full bg-white/5" />
              <Skeleton className="size-6 rounded-full bg-white/5" />
              <Skeleton className="size-6 rounded-full bg-white/5" />
              <Skeleton className="h-6 w-16 rounded-full bg-white/5" />
            </div>
          </div>
        ))}
      </div>

      {/* Indexed documents skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-40 bg-white/5" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="glass-panel flex items-center justify-between rounded-xl border border-white/5 p-4"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="size-5 rounded bg-white/5" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-48 bg-white/5" />
                <Skeleton className="h-3 w-36 bg-white/5" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-14 rounded-full bg-white/5" />
              <Skeleton className="size-7 rounded bg-white/5" />
              <Skeleton className="size-7 rounded bg-white/5" />
              <Skeleton className="size-7 rounded bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
