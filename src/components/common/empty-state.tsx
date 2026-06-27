"use client"

import type { LucideIcon } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface EmptyStateAction {
  label: string
  onClick?: () => void
  href?: string
}

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  primaryAction?: EmptyStateAction
  secondaryAction?: EmptyStateAction
  className?: string
}

function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "glass-panel flex flex-col items-center justify-center rounded-xl px-6 py-12 text-center",
        className
      )}
    >
      {Icon && (
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
          <Icon className="size-6 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-base font-medium text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {(primaryAction || secondaryAction) && (
        <div className="mt-4 flex items-center gap-3">
          {primaryAction &&
            (primaryAction.href ? (
              <Link href={primaryAction.href}>
                <Button>{primaryAction.label}</Button>
              </Link>
            ) : (
              <Button onClick={primaryAction.onClick}>
                {primaryAction.label}
              </Button>
            ))}
          {secondaryAction &&
            (secondaryAction.href ? (
              <Link href={secondaryAction.href}>
                <Button variant="outline">{secondaryAction.label}</Button>
              </Link>
            ) : (
              <Button variant="outline" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            ))}
        </div>
      )}
    </motion.div>
  )
}

export { EmptyState }
