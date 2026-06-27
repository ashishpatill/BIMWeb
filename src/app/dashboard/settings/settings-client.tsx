"use client";

import { useSearchParams } from "next/navigation";
import { useState, useCallback, useTransition, type ComponentType } from "react";
import { toast } from "sonner";
import {
  User,
  Palette,
  Bell,
  Building2,
  Key,
  AlertTriangle,
  Sun,
  Moon,
  Monitor,
  Save,
  ExternalLink,
  Loader2,
  Info,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { PageHeader, SegmentedTabs, type SegmentedTab } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  updateUserProfile,
  updateNotificationPreferences,
  updateWorkspace,
} from "@/lib/actions";

// ─── Types ───────────────────────────────────────────────

interface KindeUser {
  id: string;
  email: string | null;
  given_name: string | null;
  family_name: string | null;
  picture: string | null;
}

interface DbUser {
  id: number;
  kindeId: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  onboardingState: unknown;
  createdAt: Date;
}

interface NotificationPrefs {
  id: number;
  userId: string;
  inviteEmails: boolean | null;
  sharedEmails: boolean | null;
  projectEmails: boolean | null;
}

interface Workspace {
  id: number;
  name: string;
  ownerId: string;
  createdAt: Date;
}

interface SettingsClientProps {
  kindeUser: KindeUser | null;
  dbUser: DbUser | null;
  preferences: NotificationPrefs | null;
  workspaces: Workspace[];
}

// ─── Constants ───────────────────────────────────────────

const SETTINGS_TABS: SegmentedTab[] = [
  { value: "profile", label: "Profile", icon: User },
  { value: "appearance", label: "Appearance", icon: Palette },
  { value: "notifications", label: "Notifications", icon: Bell },
  { value: "workspace", label: "Workspace", icon: Building2 },
  { value: "api-keys", label: "API Keys", icon: Key },
];

type TabValue = (typeof SETTINGS_TABS)[number]["value"];

// ─── Helpers ─────────────────────────────────────────────

function getInitials(kindeUser: KindeUser | null): string {
  if (!kindeUser) return "U";
  const first = kindeUser.given_name?.[0] || "";
  const last = kindeUser.family_name?.[0] || "";
  return (first + last).toUpperCase() || kindeUser.email?.[0]?.toUpperCase() || "U";
}

// ─── Inline Switch Toggle ────────────────────────────────

function SwitchToggle({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium text-white">{label}</Label>
        {description && (
          <p className="text-xs text-zinc-400">{description}</p>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          checked ? "bg-primary" : "bg-zinc-700",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <span
          className={cn(
            "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform",
            checked ? "translate-x-4" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}

// ─── Appearance Theme Button ─────────────────────────────

function ThemeOption({
  label,
  icon: Icon,
  isActive,
  onClick,
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border p-4 transition-all",
        isActive
          ? "border-primary bg-primary/10 text-white"
          : "border-white/5 bg-zinc-950/40 text-zinc-400 hover:border-white/20 hover:text-zinc-200",
      )}
      aria-label={`${label} theme`}
      aria-pressed={isActive}
    >
      <Icon className={cn("size-6", isActive && "text-primary")} />
      <span className="text-sm font-medium">{label}</span>
      {isActive && (
        <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">
          Active
        </span>
      )}
    </button>
  );
}

// ─── Main Component ──────────────────────────────────────

export function SettingsClient({
  kindeUser,
  dbUser,
  preferences,
  workspaces,
}: SettingsClientProps) {
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabValue) || "profile";
  const { theme, setTheme } = useTheme();

  // ── Profile form state ──

  const [firstName, setFirstName] = useState(dbUser?.firstName ?? kindeUser?.given_name ?? "");
  const [lastName, setLastName] = useState(dbUser?.lastName ?? kindeUser?.family_name ?? "");
  const [isSavingProfile, startSaveProfile] = useTransition();

  // ── Notification toggle state ──

  const [notifInvite, setNotifInvite] = useState(preferences?.inviteEmails ?? true);
  const [notifShared, setNotifShared] = useState(preferences?.sharedEmails ?? true);
  const [notifProject, setNotifProject] = useState(preferences?.projectEmails ?? true);
  const [isSavingNotifs, startSaveNotifs] = useTransition();

  // ── Workspace rename state ──

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(
    workspaces[0]?.id ?? null,
  );
  const [workspaceName, setWorkspaceName] = useState(workspaces[0]?.name ?? "");
  const [isSavingWorkspace, startSaveWorkspace] = useTransition();

  // ── Profile save handler ──

  const handleSaveProfile = useCallback(() => {
    startSaveProfile(async () => {
      const result = await updateUserProfile({ firstName, lastName });
      if (result.success) {
        toast.success("Profile updated");
      } else {
        toast.error(result.error ?? "Failed to update profile");
      }
    });
  }, [firstName, lastName]);

  // ── Notification save handler ──

  const saveNotification = useCallback(
    (field: "inviteEmails" | "sharedEmails" | "projectEmails", value: boolean) => {
      startSaveNotifs(async () => {
        const patch: Partial<{
          inviteEmails: boolean;
          sharedEmails: boolean;
          projectEmails: boolean;
        }> = {};
        patch[field] = value;
        const result = await updateNotificationPreferences(patch);
        if (result.success) {
          toast.success("Notification preference updated");
        } else {
          toast.error(result.error ?? "Failed to update preference");
        }
      });
    },
    [],
  );

  const handleNotifInvite = useCallback(
    (checked: boolean) => {
      setNotifInvite(checked);
      saveNotification("inviteEmails", checked);
    },
    [saveNotification],
  );

  const handleNotifShared = useCallback(
    (checked: boolean) => {
      setNotifShared(checked);
      saveNotification("sharedEmails", checked);
    },
    [saveNotification],
  );

  const handleNotifProject = useCallback(
    (checked: boolean) => {
      setNotifProject(checked);
      saveNotification("projectEmails", checked);
    },
    [saveNotification],
  );

  // ── Workspace rename handler ──

  const handleRenameWorkspace = useCallback(() => {
    if (!selectedWorkspaceId || !workspaceName.trim()) return;
    startSaveWorkspace(async () => {
      const result = await updateWorkspace(selectedWorkspaceId, workspaceName.trim());
      if (result.success) {
        toast.success("Workspace renamed");
      } else {
        toast.error(result.error ?? "Failed to rename workspace");
      }
    });
  }, [selectedWorkspaceId, workspaceName]);

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader
        title="Settings"
        description="Configure your account, workspace, and preferences."
        breadcrumbs={[{ label: "Settings" }]}
      />

      <SegmentedTabs tabs={SETTINGS_TABS} searchParam="tab" />

      {/* Tab content */}
      {activeTab === "profile" && (
        <ProfileTabContent
          kindeUser={kindeUser}
          dbUser={dbUser}
          firstName={firstName}
          lastName={lastName}
          onFirstNameChange={setFirstName}
          onLastNameChange={setLastName}
          onSave={handleSaveProfile}
          isSaving={isSavingProfile}
        />
      )}

      {activeTab === "appearance" && (
        <AppearanceTabContent theme={theme} onThemeChange={setTheme} />
      )}

      {activeTab === "notifications" && (
        <NotificationsTabContent
          invite={notifInvite}
          shared={notifShared}
          project={notifProject}
          onInviteChange={handleNotifInvite}
          onSharedChange={handleNotifShared}
          onProjectChange={handleNotifProject}
          isSaving={isSavingNotifs}
        />
      )}

      {activeTab === "workspace" && (
        <WorkspaceTabContent
          workspaces={workspaces}
          selectedWorkspaceId={selectedWorkspaceId}
          workspaceName={workspaceName}
          onWorkspaceSelect={(id, name) => {
            setSelectedWorkspaceId(id);
            setWorkspaceName(name);
          }}
          onWorkspaceNameChange={setWorkspaceName}
          onRename={handleRenameWorkspace}
          isSaving={isSavingWorkspace}
        />
      )}

      {activeTab === "api-keys" && <ApiKeysTabContent />}

      {/* Danger Zone — always visible */}
      <DangerZoneCard />
    </div>
  );
}

// ─── Profile Tab ─────────────────────────────────────────

function ProfileTabContent({
  kindeUser,
  dbUser,
  firstName,
  lastName,
  onFirstNameChange,
  onLastNameChange,
  onSave,
  isSaving,
}: {
  kindeUser: KindeUser | null;
  dbUser: DbUser | null;
  firstName: string;
  lastName: string;
  onFirstNameChange: (v: string) => void;
  onLastNameChange: (v: string) => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Avatar + Identity Card */}
      <Card className="glass-panel border border-white/5 bg-white/5 rounded-2xl p-6">
        <CardContent className="p-0">
          <div className="flex items-center gap-6">
            <Avatar className="size-20 border-2 border-primary/40 bg-primary/10 text-primary flex items-center justify-center font-bold text-3xl">
              {kindeUser?.picture ? (
                <AvatarImage src={kindeUser.picture} alt="Profile picture" />
              ) : null}
              <AvatarFallback className="bg-transparent text-primary">
                {getInitials(kindeUser)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">
                {dbUser?.name ||
                  `${kindeUser?.given_name ?? ""} ${kindeUser?.family_name ?? ""}`.trim() ||
                  "BIMWeb User"}
              </h3>
              <div className="flex items-center gap-1.5">
                <p className="text-sm text-zinc-400">{kindeUser?.email ?? dbUser?.email}</p>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        className="text-zinc-500 hover:text-zinc-300"
                        aria-label="Email managed by Kinde"
                      >
                        <Info className="size-3.5" />
                      </button>
                    }
                  />
                  <TooltipContent side="right">
                    <p className="text-xs">Email is managed by Kinde authentication</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Name Editor Card */}
      <Card className="glass-panel border border-white/5 bg-white/5 rounded-2xl p-6">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <User className="size-5 text-primary" /> Profile Information
          </CardTitle>
          <CardDescription className="text-sm text-zinc-400">
            Edit your display name. Your email address is managed by Kinde and cannot be changed
            here.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first-name" className="text-sm font-medium text-zinc-300">
                First Name
              </Label>
              <Input
                id="first-name"
                value={firstName}
                onChange={(e) => onFirstNameChange(e.target.value)}
                placeholder="First name"
                className="bg-zinc-950/40 border-white/5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name" className="text-sm font-medium text-zinc-300">
                Last Name
              </Label>
              <Input
                id="last-name"
                value={lastName}
                onChange={(e) => onLastNameChange(e.target.value)}
                placeholder="Last name"
                className="bg-zinc-950/40 border-white/5"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={onSave} disabled={isSaving}>
              {isSaving && <Loader2 className="size-4 animate-spin" />}
              <Save className="size-4" />
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Appearance Tab ──────────────────────────────────────

function AppearanceTabContent({
  theme,
  onThemeChange,
}: {
  theme: string;
  onThemeChange: (t: "light" | "dark" | "system") => void;
}) {
  const options = [
    { value: "light" as const, label: "Light", icon: Sun },
    { value: "dark" as const, label: "Dark", icon: Moon },
    { value: "system" as const, label: "System", icon: Monitor },
  ];

  return (
    <Card className="glass-panel border border-white/5 bg-white/5 rounded-2xl p-6">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
          <Palette className="size-5 text-primary" /> Appearance
        </CardTitle>
        <CardDescription className="text-sm text-zinc-400">
          Choose your preferred color scheme. This setting is saved locally.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-3 gap-3">
          {options.map(({ value, label, icon }) => (
            <ThemeOption
              key={value}
              label={label}
              icon={icon}
              isActive={theme === value}
              onClick={() => onThemeChange(value)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Notifications Tab ──────────────────────────────────

function NotificationsTabContent({
  invite,
  shared,
  project,
  onInviteChange,
  onSharedChange,
  onProjectChange,
  isSaving,
}: {
  invite: boolean;
  shared: boolean;
  project: boolean;
  onInviteChange: (v: boolean) => void;
  onSharedChange: (v: boolean) => void;
  onProjectChange: (v: boolean) => void;
  isSaving: boolean;
}) {
  return (
    <Card className="glass-panel border border-white/5 bg-white/5 rounded-2xl p-6">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
          <Bell className="size-5 text-primary" /> Email Notifications
        </CardTitle>
        <CardDescription className="text-sm text-zinc-400">
          Control which emails you receive from BIMWeb.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-white/5">
          <SwitchToggle
            label="Team invites"
            description="When someone invites you to a project or workspace"
            checked={invite}
            onCheckedChange={onInviteChange}
            disabled={isSaving}
          />
          <SwitchToggle
            label="Shared projects"
            description="When a project is shared with you"
            checked={shared}
            onCheckedChange={onSharedChange}
            disabled={isSaving}
          />
          <SwitchToggle
            label="Project updates"
            description="When models or documents are added to your projects"
            checked={project}
            onCheckedChange={onProjectChange}
            disabled={isSaving}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Workspace Tab ──────────────────────────────────────

function WorkspaceTabContent({
  workspaces,
  selectedWorkspaceId,
  workspaceName,
  onWorkspaceSelect,
  onWorkspaceNameChange,
  onRename,
  isSaving,
}: {
  workspaces: Workspace[];
  selectedWorkspaceId: number | null;
  workspaceName: string;
  onWorkspaceSelect: (id: number, name: string) => void;
  onWorkspaceNameChange: (v: string) => void;
  onRename: () => void;
  isSaving: boolean;
}) {
  const currentWorkspace = workspaces.find((w) => w.id === selectedWorkspaceId);

  if (workspaces.length === 0) {
    return (
      <Card className="glass-panel border border-white/5 bg-white/5 rounded-2xl p-6">
        <CardContent className="p-0 text-center py-8">
          <Building2 className="size-10 text-zinc-500 mx-auto mb-3" />
          <p className="text-zinc-400">No workspaces yet. Create one from the sidebar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Workspace selection & rename */}
      <Card className="glass-panel border border-white/5 bg-white/5 rounded-2xl p-6">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="size-5 text-primary" /> Workspace Settings
          </CardTitle>
          <CardDescription className="text-sm text-zinc-400">
            Manage your workspaces. Changes apply immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 space-y-4">
          {workspaces.length > 1 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-zinc-300">Select Workspace</Label>
              <div className="flex flex-wrap gap-2">
                {workspaces.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => onWorkspaceSelect(w.id, w.name)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
                      w.id === selectedWorkspaceId
                        ? "border-primary bg-primary/10 text-white"
                        : "border-white/5 bg-zinc-950/40 text-zinc-400 hover:border-white/20",
                    )}
                  >
                    {w.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="workspace-name" className="text-sm font-medium text-zinc-300">
              Workspace Name
            </Label>
            <div className="flex gap-2">
              <Input
                id="workspace-name"
                value={workspaceName}
                onChange={(e) => onWorkspaceNameChange(e.target.value)}
                placeholder="Workspace name"
                className="bg-zinc-950/40 border-white/5"
              />
              <Button onClick={onRename} disabled={isSaving || !workspaceName.trim()}>
                {isSaving && <Loader2 className="size-4 animate-spin" />}
                Rename
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workspace Danger Zone */}
      <Card className="glass-panel border border-red-500/20 bg-red-500/5 rounded-2xl p-6">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-lg font-bold text-red-400 flex items-center gap-2">
            <AlertTriangle className="size-5" /> Workspace Danger Zone
          </CardTitle>
          <CardDescription className="text-sm text-zinc-400">
            Destructive actions for workspace &ldquo;{currentWorkspace?.name ?? "Unknown"}
            &rdquo;.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 space-y-3">
          <div className="flex items-center justify-between p-3 bg-zinc-950/40 border border-white/5 rounded-xl">
            <div>
              <p className="text-sm font-medium text-white">Delete workspace</p>
              <p className="text-xs text-zinc-500">
                Permanently delete this workspace and all its data
              </p>
            </div>
            <Button variant="destructive" disabled>
              Delete Workspace
            </Button>
          </div>
          <p className="text-xs text-zinc-500">
            To delete a workspace, contact your workspace admin. This action cannot be undone.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── API Keys Tab ────────────────────────────────────────

function ApiKeysTabContent() {
  return (
    <Card className="glass-panel border border-white/5 bg-white/5 rounded-2xl p-6">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
          <Key className="size-5 text-primary" /> API Keys
        </CardTitle>
        <CardDescription className="text-sm text-zinc-400">
          Manage your API keys for programmatic access to BIMWeb.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4 bg-zinc-950/40 border border-white/5 rounded-xl">
          <div className="space-y-1">
            <p className="text-sm font-medium text-white">Full API Key Management</p>
            <p className="text-xs text-zinc-400">
              Create, revoke, and rotate API keys. Monitor usage and set rate limits.
            </p>
          </div>
          <Link href="/dashboard/api-keys">
            <Button variant="outline" className="gap-2">
              Manage Keys
              <ExternalLink className="size-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Danger Zone Card ────────────────────────────────────

function DangerZoneCard() {
  return (
    <Card className="glass-panel border border-red-500/20 bg-red-500/5 rounded-2xl p-6">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-lg font-bold text-red-400 flex items-center gap-2">
          <AlertTriangle className="size-5" /> Danger Zone
        </CardTitle>
        <CardDescription className="text-sm text-zinc-400">
          Irreversible account actions.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 space-y-3">
        <div className="flex items-center justify-between p-3 bg-zinc-950/40 border border-white/5 rounded-xl">
          <div>
            <p className="text-sm font-medium text-white">Delete account</p>
            <p className="text-xs text-zinc-500">
              Permanently delete your account and all associated data
            </p>
          </div>
          <Button variant="destructive" disabled>
            Delete Account
          </Button>
        </div>
        <p className="text-xs text-zinc-500">
          Account deletion is not yet available in the UI. Please contact support at{" "}
          <span className="text-zinc-300">support@bimweb.io</span> to request account deletion.
        </p>
      </CardContent>
    </Card>
  );
}
