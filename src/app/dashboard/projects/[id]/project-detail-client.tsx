"use client";

import { useState } from "react";
import { Box, Users, Settings, Calendar, ChevronRight } from "lucide-react";
import Link from "next/link";

interface Model {
  id: number;
  name: string;
  description: string | null;
  fileSize: string;
  status: string;
  createdAt: Date;
}

interface ProjectDetailClientProps {
  projectId: number;
  projectName: string;
  initialModels: Model[];
}

export function ProjectDetailClient({ projectId: _projectId, projectName, initialModels }: ProjectDetailClientProps) {
  const [activeTab, setActiveTab] = useState<"models" | "team" | "settings">("models");

  const tabs = [
    { id: "models" as const, label: "Models", icon: Box, count: initialModels.length },
    { id: "team" as const, label: "Team", icon: Users },
    { id: "settings" as const, label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 border border-white/5 w-fit">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                isActive
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isActive ? "bg-primary/30 text-primary" : "bg-white/10 text-zinc-400"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Models Tab */}
      {activeTab === "models" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Models in {projectName}</h3>
            <Link
              href="/dashboard/models"
              className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
            >
              Upload Model <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {initialModels.length === 0 ? (
            <div className="glass-panel p-10 flex flex-col items-center justify-center text-center gap-3 border border-white/5 rounded-2xl">
              <Box className="w-12 h-12 text-zinc-600" />
              <div>
                <h4 className="text-base font-bold text-white mb-1">No Models Yet</h4>
                <p className="text-sm text-zinc-400 max-w-sm">
                  Upload your first BIM model to this project for 3D visualization.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {initialModels.map((model) => (
                <Link
                  key={model.id}
                  href={`/dashboard/models`}
                  className="glass-panel border border-white/5 hover:border-primary/30 rounded-xl p-4 transition-all group block"
                >
                  <div className="flex items-start justify-between mb-3">
                    <Box className="w-8 h-8 text-primary" />
                    <span className="text-[10px] font-mono text-zinc-500 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                      {model.fileSize}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate mb-1">
                    {model.name}
                  </h4>
                  <p className="text-xs text-zinc-400 line-clamp-2 mb-3">
                    {model.description || "No description"}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(model.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-emerald-400 font-semibold">Ready</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Team Tab */}
      {activeTab === "team" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Team Members</h3>
            <Link
              href="/dashboard/team"
              className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
            >
              Manage Team <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="glass-panel p-10 flex flex-col items-center justify-center text-center gap-3 border border-white/5 rounded-2xl">
            <Users className="w-12 h-12 text-zinc-600" />
            <div>
              <h4 className="text-base font-bold text-white mb-1">Team Management</h4>
              <p className="text-sm text-zinc-400 max-w-sm">
                Invite collaborators and manage their roles from the Team page.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="flex flex-col gap-3">
          <h3 className="text-lg font-bold text-white">Project Settings</h3>
          <div className="glass-panel p-10 flex flex-col items-center justify-center text-center gap-3 border border-white/5 rounded-2xl">
            <Settings className="w-12 h-12 text-zinc-600" />
            <div>
              <h4 className="text-base font-bold text-white mb-1">Project Configuration</h4>
              <p className="text-sm text-zinc-400 max-w-sm">
                Configure project-level settings, notifications, and integrations.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
