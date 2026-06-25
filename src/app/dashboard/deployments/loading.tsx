import { Loader2 } from "lucide-react";

export default function DeploymentsLoading() {
  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="h-9 w-44 bg-white/5 rounded-xl animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="glass-panel border border-white/5 rounded-2xl p-5 h-28 animate-pulse" />
        ))}
      </div>
      <div className="glass-panel border border-white/5 rounded-2xl p-10 h-40 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    </div>
  );
}
