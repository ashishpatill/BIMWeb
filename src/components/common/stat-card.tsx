import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export interface StatCardProps {
  label: string
  value: number | string | undefined
  icon?: LucideIcon
  loading?: boolean
  hint?: string
  source?: string
  className?: string
}

function StatCard({
  label,
  value,
  icon: Icon,
  loading = false,
  hint,
  source,
  className,
}: StatCardProps) {
  const displayValue =
    value === undefined || value === null
      ? "—"
      : typeof value === "number"
        ? value.toLocaleString()
        : value

  return (
    <Card className={cn("", className)}>
      <CardContent className="flex items-start gap-3 p-4">
        {Icon && (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon className="size-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </span>
            {hint && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      className="inline-flex size-3.5 cursor-help items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      aria-label={hint}
                    />
                  }
                >
                  <span aria-hidden="true">?</span>
                </TooltipTrigger>
                <TooltipContent side="top">{hint}</TooltipContent>
              </Tooltip>
            )}
          </div>
          {loading ? (
            <Skeleton className="mt-0.5 h-7 w-20" />
          ) : (
            <span className="text-2xl font-semibold tracking-tight text-foreground">
              {displayValue}
            </span>
          )}
          {source && (
            <span className="mt-0.5 text-[11px] text-muted-foreground">
              {source}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export { StatCard }
