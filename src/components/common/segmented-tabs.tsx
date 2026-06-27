"use client"

import { useCallback } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SegmentedTab {
  value: string
  label: string
  icon?: LucideIcon
  badge?: string | number
}

export interface SegmentedTabsProps {
  tabs: SegmentedTab[]
  value?: string
  onValueChange?: (value: string) => void
  searchParam?: string
  className?: string
  ariaLabel?: string
}

function SegmentedTabs({
  tabs,
  value: controlledValue,
  onValueChange,
  searchParam,
  className,
  ariaLabel,
}: SegmentedTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const resolvedValue =
    controlledValue ??
    (searchParam ? searchParams.get(searchParam) ?? tabs[0]?.value : tabs[0]?.value)

  const handleChange = useCallback(
    (newValue: string) => {
      if (searchParam) {
        const params = new URLSearchParams(searchParams.toString())
        params.set(searchParam, newValue)
        router.push(`${pathname}?${params.toString()}`)
      }
      onValueChange?.(newValue)
    },
    [searchParam, searchParams, pathname, router, onValueChange]
  )

  return (
      <div
        className={cn(
          "flex items-center gap-0.5 rounded-lg bg-muted p-0.5",
          className
        )}
        role="tablist"
        aria-label={ariaLabel || "Tab navigation"}
      >
      {tabs.map((tab) => {
        const isActive = resolvedValue === tab.value
        const Icon = tab.icon
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={isActive}
            onClick={() => handleChange(tab.value)}
            className={cn(
              "relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {Icon && <Icon className="size-4" />}
            {tab.label}
            {tab.badge !== undefined && (
              <span
                className={cn(
                  "ml-0.5 inline-flex size-5 items-center justify-center rounded-full text-[11px] font-semibold",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "bg-muted-foreground/10 text-muted-foreground"
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export { SegmentedTabs }
