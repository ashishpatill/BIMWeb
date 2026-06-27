"use client"

import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export type ConnectionStatus = "healthy" | "degraded" | "offline" | "unknown"

export interface ConnectionBadgeProps {
  status?: ConnectionStatus
  label?: string
  className?: string
}

const statusConfig: Record<
  ConnectionStatus,
  { dot: string; defaultLabel: string; tooltip: string }
> = {
  healthy: {
    dot: "bg-emerald-500",
    defaultLabel: "Healthy",
    tooltip: "All systems operational",
  },
  degraded: {
    dot: "bg-amber-500",
    defaultLabel: "Degraded",
    tooltip: "Some features may be slower or unavailable",
  },
  offline: {
    dot: "bg-red-500",
    defaultLabel: "Offline",
    tooltip: "Service is currently unreachable",
  },
  unknown: {
    dot: "bg-zinc-500",
    defaultLabel: "Unknown",
    tooltip: "Status has not been checked yet",
  },
}

function ConnectionBadge({
  status = "unknown",
  label,
  className,
}: ConnectionBadgeProps) {
  const config = statusConfig[status]
  const displayLabel = label ?? config.defaultLabel

  return (
    <Tooltip>
      <TooltipTrigger>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
              status === "healthy" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
              status === "degraded" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
              status === "offline" && "bg-red-500/10 text-red-600 dark:text-red-400",
              status === "unknown" && "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
              className
            )}
            aria-label={`${displayLabel}: ${config.tooltip}`}
          >
          <span
            className={cn("size-1.5 rounded-full", config.dot)}
            aria-hidden="true"
          />
          {displayLabel}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">{config.tooltip}</TooltipContent>
    </Tooltip>
  )
}

export { ConnectionBadge }
