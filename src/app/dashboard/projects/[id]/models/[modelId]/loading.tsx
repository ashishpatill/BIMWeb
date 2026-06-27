import { Loader2 } from "lucide-react";

export default function ModelViewerLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <div className="text-sm text-zinc-400 font-medium">
          Loading viewer…
        </div>
        <div className="w-48 h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-pulse w-1/3" />
        </div>
      </div>
    </div>
  );
}
