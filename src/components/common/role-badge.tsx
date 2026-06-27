"use client"

import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export type RoleType = "admin" | "editor" | "viewer"

export interface RoleBadgeProps {
  role: RoleType
  className?: string
}

const roleConfig: Record<RoleType, { color: string; label: string; description: string }> =
  {
    admin: {
      color:
        "bg-purple-500/10 text-purple-600 dark:text-purple-400",
      label: "Admin",
      description: "Full control over projects, team, and settings",
    },
    editor: {
      color:
        "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      label: "Editor",
      description: "Can upload models, edit projects, and run searches",
    },
    viewer: {
      color:
        "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
      label: "Viewer",
      description: "Read-only access to projects and models",
    },
  }

function RoleBadge({ role, className }: RoleBadgeProps) {
  const config = roleConfig[role]

  return (
    <Tooltip>
      <TooltipTrigger>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            config.color,
            className
          )}
        >
          {config.label}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">{config.description}</TooltipContent>
    </Tooltip>
  )
}

export { RoleBadge }
