"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Mail, Shield, Calendar, UserPlus, AlertCircle, Loader2, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { addTeamMember, removeTeamMember } from "@/lib/actions";

interface TeamMember {
  id: number;
  email: string;
  role: string;
  joinedAt: Date;
  projectId: number;
  projectName?: string;
}

interface Project {
  id: number;
  name: string;
}

interface TeamClientProps {
  initialMembers: TeamMember[];
  projects: Project[];
}

export function TeamClient({ initialMembers, projects }: TeamClientProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [role, setRole] = useState<string>("viewer");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deleteMemberId, setDeleteMemberId] = useState<number | null>(null);
  const [deleteIsPending, startDeleteTransition] = useTransition();

  const handleRemoveMember = async () => {
    if (deleteMemberId === null) return;
    startDeleteTransition(async () => {
      const res = await removeTeamMember(deleteMemberId);
      if (res.success) {
        setDeleteMemberId(null);
        router.refresh();
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !projectId) {
      setError("Please fill in all fields.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await addTeamMember(Number(projectId), email, role);
      if (res.success) {
        setIsOpen(false);
        setEmail("");
        setProjectId("");
        setRole("viewer");
        router.refresh();
      } else {
        setError(res.error || "Failed to invite team member");
      }
    });
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">Team Collaborators</h1>
          <p className="text-zinc-400">Invite, organize, and manage permissions for project team members.</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger render={<Button className="w-full sm:w-auto px-6 py-5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(var(--primary),0.3)] transition-all hover:scale-105 active:scale-95" />}>
            <UserPlus className="w-5 h-5" />
            Invite Member
          </DialogTrigger>
          <DialogContent className="glass-panel border border-white/10 bg-zinc-950/97 text-white max-w-md rounded-2xl p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="text-primary w-6 h-6" /> Invite Team Member
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                Grant access to specific projects and customize editing/viewing roles.
              </DialogDescription>
            </DialogHeader>

            {projects.length === 0 ? (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl flex items-start gap-3 mt-2">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold">No Projects Available</p>
                  <p className="mt-1 text-zinc-400">You must create at least one project before inviting team members.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-zinc-300">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="colleague@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 bg-white/5 border-white/10 text-white rounded-xl focus:border-primary/50"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-zinc-300">Assign Project Access</Label>
                  <Select value={projectId} onValueChange={(val) => setProjectId(val || "")} required>
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
                  <Label className="text-sm font-semibold text-zinc-300">Role permissions</Label>
                  <Select value={role} onValueChange={(val) => setRole(val || "viewer")} required>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl focus:border-primary/50">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border border-white/10 text-white rounded-xl">
                      <SelectItem value="admin" className="focus:bg-primary/20 focus:text-white">Admin (Full Control)</SelectItem>
                      <SelectItem value="editor" className="focus:bg-primary/20 focus:text-white">Editor (Edit Models)</SelectItem>
                      <SelectItem value="viewer" className="focus:bg-primary/20 focus:text-white">Viewer (Read-Only)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {error && <p className="text-sm font-semibold text-red-400 mt-2">{error}</p>}

                <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsOpen(false)}
                    className="w-full sm:w-auto rounded-xl border border-white/5 text-zinc-400 hover:text-white hover:bg-white/5"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending || !email.trim() || !projectId}
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Inviting...
                      </>
                    ) : (
                      "Send Invite"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Collaborators List */}
      <div className="flex flex-col gap-4">
        {initialMembers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-10 h-72 flex flex-col items-center justify-center text-center gap-4 border border-white/5 rounded-2xl"
          >
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
              <Users className="w-8 h-8 text-zinc-500" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-1">No Collaborators Yet</h3>
              <p className="text-sm text-zinc-400 max-w-sm mx-auto">
                Invite colleagues or sub-contractors to access and manage your BIM models.
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {initialMembers.map((member, index) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                >
                  <Card className="glass-panel border border-white/5 hover:border-primary/20 bg-white/5 rounded-2xl overflow-hidden relative group transition-colors duration-300">
                    <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
                        <div className="flex items-center gap-4 mb-4">
                          <Avatar className="w-10 h-10 border border-primary/20 bg-primary/10 text-primary flex items-center justify-center font-bold">
                            <AvatarFallback className="bg-transparent text-primary">{getInitials(member.email)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-white truncate">{member.email}</h4>
                            <span className="text-[10px] text-zinc-500 font-semibold flex items-center gap-1 mt-0.5">
                              <Shield className="w-3 h-3 text-primary" />
                              Role: {member.role.toUpperCase()}
                            </span>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteMemberId(member.id); }}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                            title="Remove member">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                      <div className="space-y-2 mt-2 pt-4 border-t border-white/5 text-[11px] text-zinc-400">
                        <div className="flex justify-between">
                          <span className="font-semibold">Project Assigned:</span>
                          <span className="text-white font-bold max-w-[150px] truncate">{member.projectName || "Unknown Project"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold">Status:</span>
                          <span className="text-emerald-400 font-bold">Joined</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-zinc-500 pt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(member.joinedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteMemberId !== null} onOpenChange={(open) => { if (!open) setDeleteMemberId(null); }}>
        <DialogContent className="glass-panel border border-white/10 bg-zinc-950/95 text-white max-w-sm rounded-2xl p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2 text-red-400">
              <Trash2 className="w-5 h-5" /> Remove Member
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Are you sure you want to remove this team member from the project?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button type="button" variant="ghost" onClick={() => setDeleteMemberId(null)}
              className="w-full sm:w-auto rounded-xl border border-white/5 text-zinc-400 hover:text-white hover:bg-white/5">Cancel</Button>
            <Button onClick={handleRemoveMember} disabled={deleteIsPending}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl">
              {deleteIsPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Removing...</> : "Remove Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
