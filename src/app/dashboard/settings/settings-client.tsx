"use client";

import { User, Shield, Key, Database, HardDrive } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SettingsClientProps {
  // Using the native Kinde/Drizzle types which are complex intersections
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  kindeUser: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dbUser: any;
}

export function SettingsClient({ kindeUser, dbUser }: SettingsClientProps) {
  const getInitials = () => {
    if (!kindeUser) return "U";
    const first = kindeUser.given_name?.[0] || "";
    const last = kindeUser.family_name?.[0] || "";
    return (first + last).toUpperCase() || kindeUser.email?.[0].toUpperCase() || "U";
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">Settings</h1>
        <p className="text-zinc-400">Configure your account, workspace parameters, and integrations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-1">
          <Card className="glass-panel border border-white/5 bg-white/5 rounded-2xl p-6 text-center">
            <CardContent className="p-0 flex flex-col items-center gap-4">
              <Avatar className="w-24 h-24 border-2 border-primary/40 bg-primary/10 text-primary flex items-center justify-center font-bold text-3xl">
                {kindeUser?.picture ? (
                  <AvatarImage src={kindeUser.picture} alt="User Avatar" />
                ) : null}
                <AvatarFallback className="bg-transparent text-primary">{getInitials()}</AvatarFallback>
              </Avatar>

              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white">
                  {dbUser?.name || `${kindeUser?.given_name || ""} ${kindeUser?.family_name || ""}`.trim() || "BIMWeb User"}
                </h3>
                <p className="text-sm text-zinc-400 font-medium">{kindeUser?.email || dbUser?.email}</p>
              </div>

              <div className="w-full pt-4 border-t border-white/5 mt-2 flex flex-col gap-2.5 text-xs text-left">
                <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="font-semibold text-zinc-400">Auth System</span>
                  <span className="font-bold text-primary flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-primary" /> Kinde Auth
                  </span>
                </div>
                <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="font-semibold text-zinc-400">Sync Status</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" /> DB Synced
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Configurations */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Section: Profile info */}
          <Card className="glass-panel border border-white/5 bg-white/5 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> Account Metadata
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-zinc-950/40 border border-white/5 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">First Name</span>
                  <span className="text-sm font-semibold text-zinc-200">{kindeUser?.given_name || "N/A"}</span>
                </div>
                <div className="p-3 bg-zinc-950/40 border border-white/5 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Last Name</span>
                  <span className="text-sm font-semibold text-zinc-200">{kindeUser?.family_name || "N/A"}</span>
                </div>
              </div>

              <div className="p-3 bg-zinc-950/40 border border-white/5 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Kinde Identifier</span>
                <span className="text-xs font-mono text-zinc-300 select-all">{kindeUser?.id || "N/A"}</span>
              </div>
            </div>
          </Card>

          {/* Section: Infrastructure Status */}
          <Card className="glass-panel border border-white/5 bg-white/5 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" /> Platform Infrastructure
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-zinc-950/40 border border-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Neon Database</h4>
                    <p className="text-xs text-zinc-500 font-medium">Serverless Postgres Pooler</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20">
                  Connected
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-950/40 border border-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Model File Storage</h4>
                    <p className="text-xs text-zinc-500 font-medium">Direct database metadata + local buffer</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-blue-400 bg-blue-400/10 px-2.5 py-1 rounded-full border border-blue-400/20">
                  Optimized
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-950/40 border border-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-lg">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Auth Token Verification</h4>
                    <p className="text-xs text-zinc-500 font-medium">Kinde Issuer RSA signature</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-violet-400 bg-violet-400/10 px-2.5 py-1 rounded-full border border-violet-400/20">
                  Active
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
