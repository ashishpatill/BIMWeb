import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function ResearchLoading() {
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

      {/* Search input skeleton */}
      <Skeleton className="h-10 w-full rounded-lg bg-white/5" />

      {/* Tabs skeleton */}
      <div className="flex gap-1">
        <Skeleton className="h-8 w-32 rounded-md bg-white/5" />
        <Skeleton className="h-8 w-24 rounded-md bg-white/5" />
        <Skeleton className="h-8 w-24 rounded-md bg-white/5" />
        <Skeleton className="h-8 w-28 rounded-md bg-white/5" />
      </div>

      <div className="flex gap-6">
        {/* Main content skeleton */}
        <div className="min-w-0 flex-1 space-y-3">
          <Card className="border-white/5 bg-white/[0.02]">
            <CardContent className="p-5">
              <Skeleton className="mb-3 h-4 w-20 bg-white/5" />
              <Skeleton className="mb-2 h-3 w-full bg-white/5" />
              <Skeleton className="mb-2 h-3 w-full bg-white/5" />
              <Skeleton className="mb-2 h-3 w-4/5 bg-white/5" />
              <Skeleton className="h-3 w-3/5 bg-white/5" />
            </CardContent>
          </Card>
          <Card className="border-white/5 bg-white/[0.02]">
            <CardContent className="p-4">
              <Skeleton className="mb-2 h-4 w-3/5 bg-white/5" />
              <Skeleton className="mb-1 h-3 w-full bg-white/5" />
              <Skeleton className="h-3 w-4/5 bg-white/5" />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar skeleton */}
        <div className="hidden w-64 shrink-0 lg:block">
          <div className="space-y-3">
            <Skeleton className="h-4 w-20 bg-white/5" />
            <Skeleton className="h-3 w-full bg-white/5" />
            <Skeleton className="h-3 w-full bg-white/5" />
            <Skeleton className="h-3 w-4/5 bg-white/5" />
          </div>
        </div>
      </div>
    </div>
  );
}
