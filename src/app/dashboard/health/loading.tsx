import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
export default function HealthLoading() {
  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* PageHeader skeleton */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center gap-1 text-xs text-zinc-600">
          <Skeleton className="h-3 w-16 bg-white/5" />
          <span>/</span>
          <Skeleton className="h-3 w-24 bg-white/5" />
        </div>
        <Skeleton className="h-7 w-44 bg-white/5" />
        <Skeleton className="h-4 w-96 bg-white/5" />
      </div>

      {/* 4 Service card skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border border-white/5 bg-white/[0.02]">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-xl bg-white/5" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20 bg-white/5" />
                    <Skeleton className="h-4 w-16 bg-white/5" />
                  </div>
                </div>
                <Skeleton className="h-3 w-12 bg-white/5" />
              </div>
              <Skeleton className="h-3 w-48 bg-white/5" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Metrics skeleton */}
      <Card className="border border-white/5 bg-white/[0.02]">
        <CardContent className="p-5">
          <Skeleton className="h-4 w-36 bg-white/5 mb-4" />
          <div className="space-y-3">
            <Skeleton className="h-2 w-full bg-white/5" />
            <Skeleton className="h-2 w-full bg-white/5" />
            <Skeleton className="h-2 w-full bg-white/5" />
          </div>
        </CardContent>
      </Card>

      {/* Test query skeleton */}
      <Card className="border border-white/5 bg-white/[0.02]">
        <CardContent className="p-6">
          <Skeleton className="h-5 w-24 bg-white/5 mb-2" />
          <Skeleton className="h-3 w-72 bg-white/5 mb-4" />
          <div className="flex gap-3 max-w-2xl">
            <Skeleton className="h-10 flex-1 rounded-lg bg-white/5" />
            <Skeleton className="h-10 w-40 rounded-lg bg-white/5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
