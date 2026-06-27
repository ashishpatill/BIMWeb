import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface KbdProps {
  children: ReactNode
  className?: string
}

function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex items-center justify-center rounded-md border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-muted-foreground shadow-xs",
        className
      )}
    >
      {children}
    </kbd>
  )
}

export { Kbd }
