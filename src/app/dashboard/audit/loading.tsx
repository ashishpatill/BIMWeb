import { Skeleton } from "@/components/ui/skeleton";

export default function AuditLoading() {
  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* PageHeader skeleton */}
      <div className="mb-6 space-y-2">
        <Skeleton className="h-3 w-32 bg-white/5" />
        <Skeleton className="h-7 w-28 bg-white/5" />
        <Skeleton className="h-4 w-64 bg-white/5" />
      </div>

      {/* Filters bar skeleton */}
      <div className="flex flex-wrap gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <Skeleton className="h-8 w-48 rounded-lg bg-white/5" />
        <Skeleton className="h-8 w-44 rounded-lg bg-white/5" />
        <Skeleton className="h-8 w-40 rounded-lg bg-white/5" />
        <Skeleton className="h-8 w-36 rounded-lg bg-white/5" />
        <Skeleton className="h-8 w-36 rounded-lg bg-white/5" />
        <Skeleton className="h-8 w-20 rounded-lg bg-white/5" />
      </div>

      {/* Table skeleton */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-lg border border-white/5 bg-white/[0.02] p-4"
          >
            <Skeleton className="size-8 shrink-0 rounded-full bg-white/5" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-48 bg-white/5" />
              <Skeleton className="h-3 w-32 bg-white/5" />
            </div>
            <Skeleton className="h-3 w-24 rounded-md bg-white/5" />
            <Skeleton className="h-3 w-20 bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
