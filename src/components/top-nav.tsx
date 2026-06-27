"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { BellIcon, SearchIcon, LogOutIcon, SettingsIcon, UserIcon, KeyIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { CommandPalette } from "@/components/command-palette"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components"
import { Kbd } from "@/components/common"

export interface AuditEvent {
  id: number
  action: string
  createdAt: string | Date
  targetType: string
  metadata?: Record<string, unknown> | null
}

interface TopNavProps {
  user: {
    picture?: string | null
    email?: string | null
    given_name?: string | null
    family_name?: string | null
  } | null
  recentAuditEvents?: AuditEvent[]
}

function formatAuditAction(action: string): string {
  const map: Record<string, string> = {
    "project.create": "Created a project",
    "project.delete": "Deleted a project",
    "model.create": "Uploaded a model",
    "model.delete": "Deleted a model",
    "team_member.invite": "Invited a team member",
    "team_member.role_update": "Updated a team member role",
    "team_member.remove": "Removed a team member",
    "share.create": "Shared a project",
    "api_key.create": "Created an API key",
    "api_key.revoke": "Revoked an API key",
    "api_key.rotate": "Rotated an API key",
    "document.create": "Added a document",
    "document.delete": "Deleted a document",
  }
  return map[action] ?? action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function TopNav({ user, recentAuditEvents = [] }: TopNavProps) {
  const router = useRouter()

  const initials =
    [user?.given_name?.[0], user?.family_name?.[0]].filter(Boolean).join("").toUpperCase() || "?"

  const handleOpenPalette = useCallback(() => {
    // Dispatch a keyboard event to trigger the CommandPalette's global listener
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
    )
  }, [])

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-white/5 bg-zinc-950/80 px-6 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="text-zinc-400 hover:text-white" />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  className="hidden md:flex w-64 bg-zinc-900/50 border-white/10 text-sm text-zinc-400 justify-between font-normal h-9 rounded-full"
                  aria-label="Search pages and actions"
                  onClick={handleOpenPalette}
                />
              }
            >
              <div className="flex items-center gap-2">
                <SearchIcon className="size-4" />
                <span>Search pages and actions\u2026</span>
              </div>
              <div className="flex items-center gap-0.5">
                <Kbd>&#8984;</Kbd>
                <Kbd>K</Kbd>
              </div>
            </TooltipTrigger>
            <TooltipContent>Open command palette</TooltipContent>
          </Tooltip>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-zinc-400"
            aria-label="Open command palette"
            onClick={handleOpenPalette}
          >
            <SearchIcon className="size-5" />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger
                render={
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white relative" aria-label="Notifications" />
                    }
                  />
                }
              >
                <BellIcon className="size-5" />
              </TooltipTrigger>
              <TooltipContent>Notifications</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Recent activity</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {recentAuditEvents.length === 0 ? (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  No recent activity
                </div>
              ) : (
                recentAuditEvents.slice(0, 5).map((event) => (
                  <DropdownMenuItem key={event.id} className="flex flex-col items-start gap-0.5 py-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-sm">{formatAuditAction(event.action)}</span>
                  </DropdownMenuItem>
                ))
              )}
              {recentAuditEvents.length > 5 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/dashboard/audit")}>
                    View all activity
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-6 w-px bg-white/10" />

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" className="flex items-center gap-3 px-1" aria-label="User menu" />
              }
            >
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-medium text-zinc-200 leading-tight">
                  {user?.given_name} {user?.family_name}
                </span>
                <span className="text-xs text-zinc-500 leading-tight">{user?.email}</span>
              </div>
              <Avatar className="h-9 w-9 border border-white/10 ring-2 ring-primary/20">
                <AvatarImage src={user?.picture || ""} />
                <AvatarFallback className="bg-primary/20 text-primary text-sm font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="font-normal">
                <div className="font-medium text-sm">{user?.given_name} {user?.family_name}</div>
                <div className="text-xs text-muted-foreground">{user?.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
                <UserIcon className="size-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/dashboard/api-keys")}>
                <KeyIcon className="size-4" />
                API Keys
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
                <SettingsIcon className="size-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <LogoutLink className="flex items-center gap-1.5 w-full">
                  <LogOutIcon className="size-4" />
                  Sign Out
                </LogoutLink>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CommandPalette />
    </>
  )
}
