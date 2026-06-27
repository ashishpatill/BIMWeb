"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { BoxIcon, LogOutIcon } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { NAV_GROUPS } from "@/lib/navigation"
import { WorkspaceSwitcher, type Workspace } from "@/components/workspace-switcher"
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components"

interface AppSidebarProps {
  workspaces: Workspace[]
  currentWorkspaceId?: number
  projectsCount: number
  modelsCount: number
  pendingInvitesCount: number
  onWorkspaceChange: (workspaceId: number) => void
  onCreateWorkspace: (name: string) => Promise<{ success: boolean; error?: string; workspace?: Workspace }>
}

export function AppSidebar({
  workspaces,
  currentWorkspaceId,
  projectsCount,
  modelsCount,
  pendingInvitesCount,
  onWorkspaceChange,
  onCreateWorkspace,
}: AppSidebarProps) {
  const pathname = usePathname()

  const getBadge = (badgeKey?: string): number | undefined => {
    if (badgeKey === undefined) return undefined
    switch (badgeKey) {
      case "projects":
        return projectsCount
      case "models":
        return modelsCount
      case "pendingInvites":
        return pendingInvitesCount
      default:
        return undefined
    }
  }

  const isItemActive = (href: string): boolean => {
    if (href === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname.startsWith(href)
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-white/5 bg-zinc-950/50 backdrop-blur-xl" role="navigation" aria-label="Main navigation">
      <SidebarHeader className="flex flex-col gap-3 p-3 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:p-2">
        <div className="flex items-center justify-center w-full group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
              <BoxIcon className="w-5 h-5 text-primary" />
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              BIMWeb
            </span>
          </div>
        </div>
        <WorkspaceSwitcher
          workspaces={workspaces}
          currentWorkspaceId={currentWorkspaceId}
          onWorkspaceChange={onWorkspaceChange}
          onCreateWorkspace={onCreateWorkspace}
        />
      </SidebarHeader>
      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label} role="group" aria-label={group.label}>
            <SidebarGroupLabel className="text-zinc-500 uppercase tracking-wider text-xs px-2">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isItemActive(item.href)
                  const badge = getBadge(item.badgeKey)
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} aria-current={active ? "page" : undefined} />}
                        tooltip={item.label}
                        isActive={active}
                      >
                        <item.icon />
                        <span>{item.label}</span>
                        {badge !== undefined && badge > 0 && (
                          <SidebarMenuBadge className="bg-primary/20 text-primary text-[11px] font-semibold">
                            {badge > 99 ? "99+" : badge}
                          </SidebarMenuBadge>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="p-3 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <LogoutLink className="group/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm text-sidebar-foreground/70 ring-sidebar-ring outline-hidden transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2 [&_svg]:size-4 [&_svg]:shrink-0">
                Sign Out
              </LogoutLink>
            }
          >
            <LogOutIcon />
            <span className="group-data-[collapsible=icon]:hidden">Sign Out</span>
          </TooltipTrigger>
          <TooltipContent side="right" align="center">
            Sign Out
          </TooltipContent>
        </Tooltip>
      </SidebarFooter>
    </Sidebar>
  )
}
