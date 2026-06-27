"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckIcon, ChevronDownIcon, PlusIcon, Building2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "sonner"
import { useSidebar } from "@/components/ui/sidebar"

export interface Workspace {
  id: number
  name: string
}

interface WorkspaceSwitcherProps {
  workspaces: Workspace[]
  currentWorkspaceId?: number
  onWorkspaceChange: (workspaceId: number) => void
  onCreateWorkspace: (name: string) => Promise<{ success: boolean; error?: string; workspace?: Workspace }>
}

export function WorkspaceSwitcher({
  workspaces,
  currentWorkspaceId,
  onWorkspaceChange,
  onCreateWorkspace,
}: WorkspaceSwitcherProps) {
  const router = useRouter()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId) ?? workspaces[0]

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const result = await onCreateWorkspace(newName.trim())
      if (result.success) {
        toast.success(`Workspace "${newName.trim()}" created`)
        setDialogOpen(false)
        setNewName("")
        router.refresh()
      } else {
        toast.error(result.error || "Failed to create workspace")
      }
    } catch {
      toast.error("Failed to create workspace")
    } finally {
      setCreating(false)
    }
  }

  // Collapsed state: icon-only trigger with tooltip
  if (isCollapsed) {
    return (
      <>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" className="mx-auto" aria-label="Switch workspace" />
                }
              >
                <Building2Icon className="size-4" />
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">
              {currentWorkspace?.name ?? "No workspace"}
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" side="right" className="w-56">
            {workspaces.length === 0 ? (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                No workspaces yet
              </div>
            ) : (
              workspaces.map((ws) => (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => {
                    if (ws.id !== currentWorkspaceId) {
                      onWorkspaceChange(ws.id)
                    }
                  }}
                >
                  <Building2Icon className="size-4" />
                  <span className="flex-1">{ws.name}</span>
                  {ws.id === currentWorkspaceId && (
                    <CheckIcon className="size-3.5 text-primary" />
                  )}
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setDialogOpen(true)}>
              <PlusIcon className="size-4" />
              <span>Create workspace</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create workspace</DialogTitle>
              <DialogDescription>
                Workspaces group your projects, models, and team members.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label htmlFor="ws-name-collapsed" className="text-sm font-medium">
                  Workspace name
                </label>
                <Input
                  id="ws-name-collapsed"
                  placeholder="My workspace"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="mt-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate()
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!newName.trim() || creating}>
                {creating ? "Creating\u2026" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" className="w-full justify-between gap-2 px-2 h-9" aria-label="Switch workspace" />
          }
        >
          <div className="flex items-center gap-2 min-w-0">
            <Building2Icon className="size-4 shrink-0" />
            <span className="truncate text-sm font-medium">
              {currentWorkspace?.name ?? "No workspace"}
            </span>
          </div>
          <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="bottom" className="w-56">
          {workspaces.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              No workspaces yet
            </div>
          ) : (
            workspaces.map((ws) => (
              <DropdownMenuItem
                key={ws.id}
                onClick={() => {
                  if (ws.id !== currentWorkspaceId) {
                    onWorkspaceChange(ws.id)
                  }
                }}
              >
                <Building2Icon className="size-4" />
                <span className="flex-1">{ws.name}</span>
                {ws.id === currentWorkspaceId && (
                  <CheckIcon className="size-3.5 text-primary" />
                )}
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDialogOpen(true)}>
            <PlusIcon className="size-4" />
            <span>Create workspace</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create workspace</DialogTitle>
            <DialogDescription>
              Workspaces group your projects, models, and team members.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="ws-name-expanded" className="text-sm font-medium">
                Workspace name
              </label>
              <Input
                id="ws-name-expanded"
                placeholder="My workspace"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="mt-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate()
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || creating}>
              {creating ? "Creating\u2026" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
