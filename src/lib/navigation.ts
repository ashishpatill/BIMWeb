import {
  LayoutDashboardIcon,
  FolderKanbanIcon,
  PackageIcon,
  SearchIcon,
  FileTextIcon,
  UsersIcon,
  KeyIcon,
  ScrollTextIcon,
  ActivityIcon,
  SettingsIcon,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  badgeKey?: string
}

export interface NavGroup {
  label: "Workspace" | "Team" | "Platform"
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      {
        label: "Overview",
        href: "/dashboard",
        icon: LayoutDashboardIcon,
      },
      {
        label: "Projects",
        href: "/dashboard/projects",
        icon: FolderKanbanIcon,
        badgeKey: "projects",
      },
      {
        label: "Models",
        href: "/dashboard/models",
        icon: PackageIcon,
        badgeKey: "models",
      },
      {
        label: "Research",
        href: "/dashboard/research",
        icon: SearchIcon,
      },
      {
        label: "Documents",
        href: "/dashboard/documents",
        icon: FileTextIcon,
      },
    ],
  },
  {
    label: "Team",
    items: [
      {
        label: "Team",
        href: "/dashboard/team",
        icon: UsersIcon,
        badgeKey: "pendingInvites",
      },
    ],
  },
  {
    label: "Platform",
    items: [
      {
        label: "API Keys",
        href: "/dashboard/api-keys",
        icon: KeyIcon,
      },
      {
        label: "Audit Log",
        href: "/dashboard/audit",
        icon: ScrollTextIcon,
      },
      {
        label: "Platform Health",
        href: "/dashboard/health",
        icon: ActivityIcon,
      },
      {
        label: "Settings",
        href: "/dashboard/settings",
        icon: SettingsIcon,
      },
    ],
  },
]
