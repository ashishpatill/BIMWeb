import { Loader2 } from "lucide-react";

export default function SearchLoading() {
  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="h-9 w-40 bg-white/5 rounded-xl animate-pulse" />
      <div className="h-10 w-2xl max-w-2xl bg-white/5 rounded-xl animate-pulse" />
      <div className="glass-panel border border-white/5 rounded-2xl p-10 h-64 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    </div>
  );
}
