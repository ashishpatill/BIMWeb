"use client"

import type { ReactNode } from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface HelpCalloutProps {
  label?: string
  content: ReactNode
  className?: string
}

function HelpCallout({
  label = "Help",
  content,
  className,
}: HelpCalloutProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            className={cn(
              "inline-flex size-5 items-center justify-center rounded-full text-xs font-bold text-muted-foreground hover:text-foreground",
              className
            )}
            aria-label={label}
          />
        }
      >
        <span aria-hidden="true">?</span>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        className="max-w-xs text-sm"
      >
        {content}
      </PopoverContent>
    </Popover>
  )
}

export { HelpCallout }
