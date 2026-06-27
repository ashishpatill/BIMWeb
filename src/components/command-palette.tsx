"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { NAV_GROUPS } from "@/lib/navigation"
import {
  PlusIcon,
  UploadIcon,
  UserPlusIcon,
  KeyIcon,
  SearchIcon,
  HistoryIcon,
} from "lucide-react"

export interface RecentProject {
  id: string
  name: string
}

export interface CommandPaletteProps {
  recentProjects?: RecentProject[]
}

function CommandPalette({ recentProjects }: CommandPaletteProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const handleNavigate = useCallback(
    (href: string) => {
      setOpen(false)
      router.push(href)
    },
    [router]
  )

  const handleAction = useCallback(
    (callback: () => void) => {
      setOpen(false)
      callback()
    },
    []
  )

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, actions, or projects…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {NAV_GROUPS.map((group) => (
          <CommandGroup key={group.label} heading={group.label}>
            {group.items.map((item) => (
              <CommandItem
                key={item.href}
                onSelect={() => handleNavigate(item.href)}
              >
                <item.icon className="size-4" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => handleAction(() => {})}
          >
            <PlusIcon className="size-4" />
            <span>New project</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleAction(() => {})}
          >
            <UploadIcon className="size-4" />
            <span>Upload model</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleAction(() => {})}
          >
            <UserPlusIcon className="size-4" />
            <span>Invite member</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleAction(() => {})}
          >
            <KeyIcon className="size-4" />
            <span>Generate API key</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleNavigate("/dashboard/research")}
          >
            <SearchIcon className="size-4" />
            <span>Ask research</span>
          </CommandItem>
        </CommandGroup>

        {recentProjects && recentProjects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent projects">
              {recentProjects.map((project) => (
                <CommandItem
                  key={project.id}
                  onSelect={() =>
                    handleNavigate(`/dashboard/projects/${project.id}`)
                  }
                >
                  <HistoryIcon className="size-4" />
                  <span>{project.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}

export { CommandPalette }
