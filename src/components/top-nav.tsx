"use client";

import { Bell, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface TopNavProps {
  user: { picture?: string | null; email?: string | null; given_name?: string | null; family_name?: string | null } | null;
}

export function TopNav({ user }: TopNavProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-white/5 bg-zinc-950/80 px-6 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-zinc-400 hover:text-white" />
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
          <Input
            type="search"
            placeholder="Search projects..."
            className="w-64 bg-zinc-900/50 border-white/10 pl-9 text-sm text-zinc-300 focus-visible:ring-primary/50 rounded-full h-9"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-white/5">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
        </button>
        <div className="h-6 w-px bg-white/10" />
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-medium text-zinc-200">
              {user?.given_name} {user?.family_name}
            </span>
            <span className="text-xs text-zinc-500">{user?.email}</span>
          </div>
          <Avatar className="h-9 w-9 border border-white/10 ring-2 ring-primary/20 cursor-pointer hover:ring-primary/50 transition-all">
            <AvatarImage src={user?.picture || ""} />
            <AvatarFallback className="bg-primary/20 text-primary text-sm font-medium">
              {user?.given_name?.[0]}
              {user?.family_name?.[0]}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
