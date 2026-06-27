"use client";

import { useState, useTransition, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Users,
  Mail,
  UserPlus,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  Filter,
  AlertCircle,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { PageHeader, EmptyState, ConfirmDialog } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  addTeamMember,
  removeTeamMember,
  updateTeamMemberRole,
  resendInvite,
} from "@/lib/actions";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface TeamMember {
  id: number;
  email: string;
  role: string;
  inviteToken: string | null;
  joinedAt: Date;
  projectId: number;
  projectName?: string;
  userName?: string | null;
  userFirstName?: string | null;
  userLastName?: string | null;
}

interface Project {
  id: number;
  name: string;
}

interface TeamClientProps {
  initialMembers: TeamMember[];
  projects: Project[];
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export function TeamClient({
  initialMembers,
  projects,
}: TeamClientProps) {
  const router = useRouter();

  // ── State ──────────────────────────────────
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteProjectId, setInviteProjectId] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [isPending, startTransition] = useTransition();
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [deleteIsPending, startDeleteTransition] = useTransition();
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [resendCooldown, setResendCooldown] = useState<Record<number, number>>({});

  // ── Derived ─────────────────────────────────
  const filteredMembers = useMemo(() => {
    if (projectFilter === "all") return members;
    return members.filter((m) => m.projectId === Number(projectFilter));
  }, [members, projectFilter]);

  const hasProjects = projects.length > 0;

  const getInitials = useCallback((member: TeamMember): string => {
    if (member.userFirstName && member.userLastName) {
      return `${member.userFirstName[0]}${member.userLastName[0]}`.toUpperCase();
    }
    if (member.userName) {
      return member.userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return member.email.substring(0, 2).toUpperCase();
  }, []);

  const getDisplayName = useCallback((member: TeamMember): string => {
    if (member.userFirstName) {
      return `${member.userFirstName} ${member.userLastName || ""}`.trim();
    }
    if (member.userName) return member.userName;
    return "—";
  }, []);

  const isPendingMember = useCallback(
    (member: TeamMember): boolean => member.inviteToken !== null,
    [],
  );

  // ── Invite Handler ─────────────────────────
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteProjectId) {
      setInviteError("Please fill in all fields.");
      return;
    }

    setInviteError(null);
    startTransition(async () => {
      const res = await addTeamMember(
        Number(inviteProjectId),
        inviteEmail.trim(),
        inviteRole,
      );

      if (!res.success) {
        setInviteError(res.error || "Failed to send invitation");
        return;
      }

      if (res.emailSent) {
        toast.success(`Invitation sent to ${inviteEmail.trim()}`);
      } else {
        toast.error(
          `Invitation saved but email delivery failed: ${res.emailError || "Unknown error"}. You can resend later.`,
        );
      }

      setInviteOpen(false);
      setInviteEmail("");
      setInviteProjectId("");
      setInviteRole("viewer");
      router.refresh();
    });
  };

  // ── Remove Handler ─────────────────────────
  const handleRemoveMember = async () => {
    if (!deleteTarget) return;
    const memberId = deleteTarget.id;
    startDeleteTransition(async () => {
      const res = await removeTeamMember(memberId);
      if (res.success) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
        setDeleteTarget(null);
        toast.success("Team member removed");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to remove team member");
      }
    });
  };

  // ── Role Change Handler ────────────────────
  const handleRoleChange = async (memberId: number, newRole: string) => {
    startTransition(async () => {
      const res = await updateTeamMemberRole(memberId, newRole);
      if (res.success) {
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)),
        );
        toast.success("Role updated");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update role");
      }
    });
  };

  // ── Resend Handler ─────────────────────────
  const handleResend = async (member: TeamMember) => {
    const lastSent = resendCooldown[member.id];
    if (lastSent && Date.now() - lastSent < 30000) {
      toast.error("Please wait 30 seconds between resends");
      return;
    }

    startTransition(async () => {
      const res = await resendInvite(member.id);
      if (res.success && res.emailSent) {
        setResendCooldown((prev) => ({ ...prev, [member.id]: Date.now() }));
        toast.success(`Invitation resent to ${member.email}`);
      } else if (res.success && !res.emailSent) {
        toast.error(
          `Email delivery failed: ${res.emailError || "Unknown error"}`,
        );
      } else {
        toast.error(res.error || "Failed to resend invitation");
      }
      router.refresh();
    });
  };

  // ── Render ─────────────────────────────────
  const roleOptions = [
    { value: "admin", label: "Admin", description: "Full control" },
    { value: "editor", label: "Editor", description: "Upload & edit" },
    { value: "viewer", label: "Viewer", description: "Read only" },
  ];

  const inviteDialogContent = (
    <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
      <DialogContent className="glass-panel border border-white/10 bg-zinc-950/97 text-white max-w-md rounded-2xl p-6">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="text-primary size-6" /> Invite Team Member
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Grant access to specific projects with appropriate permissions.
          </DialogDescription>
        </DialogHeader>

        {!hasProjects ? (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl flex items-start gap-3 mt-2">
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">No Projects Available</p>
              <p className="mt-1 text-zinc-400">
                Create a project first before inviting team members.{" "}
                <Link
                  href="/dashboard/projects"
                  className="text-primary underline hover:text-primary/80"
                >
                  Create a project
                </Link>
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email" className="text-sm font-semibold text-zinc-300">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="pl-9 bg-white/5 border-white/10 text-white rounded-xl focus:border-primary/50"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-zinc-300">Project</Label>
              <Select
                value={inviteProjectId}
                onValueChange={(val) => setInviteProjectId(val || "")}
                required
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl focus:border-primary/50">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border border-white/10 text-white rounded-xl">
                  {projects.map((proj) => (
                    <SelectItem key={proj.id} value={proj.id.toString()} className="focus:bg-primary/20 focus:text-white">
                      {proj.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-zinc-300">Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(val) => setInviteRole(val || "viewer")}
                required
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl focus:border-primary/50">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border border-white/10 text-white rounded-xl">
                  {roleOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="focus:bg-primary/20 focus:text-white">
                      <div className="flex flex-col">
                        <span>{opt.label}</span>
                        <span className="text-[10px] text-zinc-500">{opt.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {inviteError && <p className="text-sm font-semibold text-red-400">{inviteError}</p>}

            <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2">
              <Button type="button" variant="ghost" onClick={() => setInviteOpen(false)}
                className="rounded-xl border border-white/5 text-zinc-400 hover:text-white hover:bg-white/5">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !inviteEmail.trim() || !inviteProjectId}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl">
                {isPending ? <><Loader2 className="size-4 animate-spin mr-2" /> Sending...</> : "Send Invite"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader
        title="Team"
        description="Invite, organize, and manage permissions for project team members."
        breadcrumbs={[{ label: "Team" }]}
        primaryAction={
          <Button className="gap-2" disabled={!hasProjects} onClick={() => setInviteOpen(true)}>
            <UserPlus className="size-4" />
            Invite Member
          </Button>
        }
      />

      {/* ── Project Filter ── */}
      <div className="flex items-center justify-between">
        {members.length > 0 && projects.length > 1 && (
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-zinc-400 shrink-0" />
            <Select value={projectFilter} onValueChange={(val) => setProjectFilter(val || "all")}>
              <SelectTrigger className="h-9 w-48 bg-white/5 border-white/10 text-sm rounded-xl">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border border-white/10 text-white rounded-xl">
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem
                    key={p.id}
                    value={p.id.toString()}
                    className="focus:bg-primary/20 focus:text-white"
                  >
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="text-sm text-zinc-500 ml-auto">
          {filteredMembers.length}{" "}
          {filteredMembers.length === 1 ? "member" : "members"}
        </div>
      </div>

      {/* ── Empty State ── */}
      {filteredMembers.length === 0 && !isPending && (
        <EmptyState
          icon={Users}
          title="No Collaborators Yet"
          description="Invite colleagues or subcontractors to access and manage your BIM models."
          primaryAction={
            hasProjects
              ? {
                  label: "Invite Member",
                  onClick: () => setInviteOpen(true),
                }
              : undefined
          }
        />
      )}

      {/* ── Members Table ── */}
      {filteredMembers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-xl border border-white/5 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider hidden md:table-cell">
                    Project
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider hidden sm:table-cell">
                    Invited
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider w-12">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <AnimatePresence initial={false}>
                  {filteredMembers.map((member, index) => (
                    <motion.tr
                      key={member.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.25, delay: index * 0.03 }}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8 border border-primary/20 bg-primary/10 shrink-0">
                            <AvatarFallback className="text-xs text-primary font-medium bg-transparent">
                              {getInitials(member)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-white truncate max-w-[160px]">
                            {getDisplayName(member)}
                          </span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        <Tooltip>
                          <TooltipTrigger className="truncate max-w-[180px] inline-block">
                            {member.email}
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {member.email}
                          </TooltipContent>
                        </Tooltip>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        <Select
                          value={member.role}
                          onValueChange={(val) =>
                            handleRoleChange(member.id, val || "viewer")
                          }
                          disabled={isPending}
                        >
                          <SelectTrigger className="h-8 w-28 bg-white/5 border-white/10 text-xs rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-950 border border-white/10 text-white rounded-xl">
                            {roleOptions.map((opt) => (
                              <SelectItem
                                key={opt.value}
                                value={opt.value}
                                className="focus:bg-primary/20 focus:text-white"
                              >
                                <div className="flex flex-col">
                                  <span className="text-xs font-medium">
                                    {opt.label}
                                  </span>
                                  <span className="text-[10px] text-zinc-500">
                                    {opt.description}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>

                      {/* Project */}
                      <td className="px-4 py-3 text-sm text-zinc-300 hidden md:table-cell">
                        <Tooltip>
                          <TooltipTrigger className="truncate max-w-[160px] inline-block">
                            {member.projectName || "—"}
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {member.projectName || "Unknown project"}
                          </TooltipContent>
                        </Tooltip>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {isPendingMember(member) ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400 border border-amber-500/20">
                                <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                                Pending
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              Invite sent — waiting for acceptance
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger>
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                                <span className="size-1.5 rounded-full bg-emerald-400" />
                                Joined
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              Has accepted the invitation
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </td>

                      {/* Invited Date */}
                      <td className="px-4 py-3 text-sm text-zinc-500 hidden sm:table-cell">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="size-3 text-zinc-600" />
                          {new Date(member.joinedAt).toLocaleDateString()}
                        </span>
                      </td>

                      {/* Actions Menu */}
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 data-[state=open]:bg-white/10"
                                aria-label="Member actions"
                              >
                                <MoreHorizontal className="size-4 text-zinc-400" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent
                            align="end"
                            className="bg-zinc-950 border border-white/10 text-white min-w-[160px] rounded-xl"
                          >
                            {isPendingMember(member) && (
                              <DropdownMenuItem
                                onClick={() => handleResend(member)}
                                disabled={isPending}
                                className="focus:bg-white/5 focus:text-white cursor-pointer"
                              >
                                <RefreshCw className="size-4 mr-2 text-zinc-400" />
                                Resend Invite
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(member)}
                              disabled={isPending}
                              className="focus:bg-red-500/10 focus:text-red-400 text-red-400 cursor-pointer"
                            >
                              <Trash2 className="size-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* ── Remove Confirm Dialog ── */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Remove Team Member"
        description={
          deleteTarget
            ? `Are you sure you want to remove ${deleteTarget.email} from ${deleteTarget.projectName || "the project"}? They will lose access immediately.`
            : "Are you sure you want to remove this team member?"
        }
        confirmLabel="Remove"
        onConfirm={handleRemoveMember}
        destructive
        loading={deleteIsPending}
      />

      {/* ── Invite Dialog ── */}
      {inviteDialogContent}
    </div>
  );
}
