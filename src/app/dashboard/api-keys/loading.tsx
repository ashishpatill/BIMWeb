import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function ApiKeysLoading() {
  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* PageHeader skeleton */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center gap-1 text-xs text-zinc-600">
          <Skeleton className="h-3 w-16 bg-white/5" />
          <span>/</span>
          <Skeleton className="h-3 w-16 bg-white/5" />
        </div>
        <Skeleton className="h-7 w-32 bg-white/5" />
        <Skeleton className="h-4 w-72 bg-white/5" />
      </div>

      {/* API docs links skeleton */}
      <div className="flex gap-4">
        <Skeleton className="h-4 w-36 bg-white/5" />
        <Skeleton className="h-4 w-32 bg-white/5" />
      </div>

      {/* Table skeleton */}
      <div className="space-y-3">
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="p-0">
            <div className="border-b border-white/5 px-4 py-3">
              <div className="flex gap-8">
                <Skeleton className="h-3 w-16 bg-white/5" />
                <Skeleton className="h-3 w-20 bg-white/5" />
                <Skeleton className="h-3 w-16 bg-white/5" />
                <Skeleton className="h-3 w-16 bg-white/5" />
                <Skeleton className="h-3 w-20 bg-white/5" />
                <Skeleton className="h-3 w-24 bg-white/5" />
                <Skeleton className="h-3 w-14 bg-white/5" />
              </div>
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-8 border-b border-white/5 px-4 py-4 last:border-b-0"
              >
                <Skeleton className="h-4 w-28 bg-white/5" />
                <Skeleton className="h-4 w-32 bg-white/5" />
                <Skeleton className="h-4 w-20 bg-white/5" />
                <Skeleton className="h-4 w-20 bg-white/5" />
                <Skeleton className="h-4 w-16 bg-white/5" />
                <Skeleton className="h-4 w-24 bg-white/5" />
                <Skeleton className="h-5 w-12 rounded-full bg-white/5" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
