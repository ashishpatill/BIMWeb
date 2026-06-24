"use client";

import { motion } from "framer-motion";
import { Layers, Activity, FolderGit2, Users, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface DashboardClientProps {
  projectCount: number;
  modelCount: number;
  teamCount: number;
}

export function DashboardClient({ projectCount, modelCount, teamCount }: DashboardClientProps) {
  const stats = [
    { name: "Active Projects", value: projectCount.toString(), icon: FolderGit2, change: "Real-time from database" },
    { name: "Models Processed", value: modelCount.toString(), icon: Layers, change: "Accelerated viewer ready" },
    { name: "Team Collaborators", value: teamCount.toString(), icon: Users, change: "Access controls active" },
    { name: "System Uptime", value: "99.9%", icon: Activity, change: "All systems operational" },
  ];

  return (
    <div className="flex flex-col gap-8 pb-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">
          Dashboard Overview
        </h1>
        <p className="text-zinc-400">
          Welcome back. Here&apos;s the current state of your BIM workspace.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 * (index + 1), ease: "easeOut" }}
          >
            <Card className="glass-panel overflow-hidden relative group hover:border-primary/30 transition-colors duration-300 rounded-2xl border border-white/5">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <CardContent className="p-6 relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-3xl font-bold text-white tracking-tight">
                    {stat.value}
                  </h3>
                  <p className="text-sm font-medium text-zinc-400">
                    {stat.name}
                  </p>
                </div>
                <div className="mt-4 text-[10px] font-semibold text-primary uppercase tracking-wider">
                  {stat.change}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Recent activity card */}
        <Card className="lg:col-span-2 glass-panel p-6 h-96 flex items-center justify-center flex-col gap-4 text-center border border-white/5 rounded-2xl">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
            <Activity className="w-8 h-8 text-zinc-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Recent Activity</h3>
            <p className="text-sm text-zinc-400 max-w-sm mx-auto mb-4">
              Your workspace is connected to Neon DB. Create projects and upload 3D models to see updates.
            </p>
            <Link href="/dashboard/projects">
              <Button variant="outline" className="border-white/10 text-white rounded-xl hover:bg-white/5">
                Go to Projects <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </Card>

        {/* Quick Actions Card */}
        <Card className="glass-panel p-6 h-96 flex flex-col border border-white/5 rounded-2xl justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-6">Quick Actions</h3>
            <div className="flex flex-col gap-3">
              <Link href="/dashboard/projects">
                <button className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 hover:border-white/10 text-left group">
                  <div className="bg-primary/20 p-2 rounded-lg text-primary">
                    <FolderGit2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-bold text-zinc-200 block">New Project</span>
                    <span className="text-[10px] text-zinc-500">Configure a building folder</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:translate-x-1 group-hover:text-primary transition-all" />
                </button>
              </Link>

              <Link href="/dashboard/models">
                <button className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 hover:border-white/10 text-left group">
                  <div className="bg-primary/20 p-2 rounded-lg text-primary">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-bold text-zinc-200 block">Upload Model</span>
                    <span className="text-[10px] text-zinc-500">Import IFC or glTF files</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:translate-x-1 group-hover:text-primary transition-all" />
                </button>
              </Link>

              <Link href="/dashboard/team">
                <button className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 hover:border-white/10 text-left group">
                  <div className="bg-primary/20 p-2 rounded-lg text-primary">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-bold text-zinc-200 block">Invite Team</span>
                    <span className="text-[10px] text-zinc-500">Add collaborators to project</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:translate-x-1 group-hover:text-primary transition-all" />
                </button>
              </Link>
            </div>
          </div>

          <div className="text-[10px] text-zinc-600 font-semibold text-center border-t border-white/5 pt-4">
            BIMWeb Workspace Platform v1.0
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
