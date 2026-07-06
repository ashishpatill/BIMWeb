import { isSessionAuthenticated, getSessionUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TopNav } from "@/components/top-nav";
import { syncUser, getProjects, getModels, getTeamMembers, getAuditLogsForUser } from "@/lib/actions";
import { getUserWorkspaces, createWorkspace } from "@/lib/workspace";

async function handleCreateWorkspace(name: string) {
  "use server";
  const user = await getSessionUser();
  if (!user?.id) return { success: false as const, error: "Not authenticated" };

  try {
    const workspace = await createWorkspace(name, user.id);
    revalidatePath("/dashboard");
    return { success: true as const, workspace: { id: workspace.id, name: workspace.name } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false as const, error: message };
  }
}

async function handleWorkspaceChange(_workspaceId: number) {
  "use server";
  // Workspace switching — placeholder for cookie/URL parameter update
  // Full workspace isolation (scoping DB queries by workspaceId) will be
  // implemented as part of T-PAGE-SETTINGS / multi-tenant workspace feature.
  void _workspaceId;
  revalidatePath("/dashboard");
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isSessionAuthenticated())) {
    redirect("/");
  }

  await syncUser();

  const user = await getSessionUser();

  // Fetch data for sidebar and top-nav
  const [workspaces, projects, allModels, teamMembers, auditEvents] = await Promise.all([
    user?.id ? getUserWorkspaces(user.id) : Promise.resolve([]),
    getProjects(),
    getModels(),
    getTeamMembers(),
    getAuditLogsForUser({ limit: 10 }),
  ]);

  const projectsCount = projects.length;
  const modelsCount = allModels.length;
  const pendingInvitesCount = teamMembers.length;
  const currentWorkspaceId = workspaces[0]?.id;

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-zinc-950 text-zinc-50 overflow-hidden">
        <AppSidebar
          workspaces={workspaces.map((w) => ({ id: w.id, name: w.name }))}
          currentWorkspaceId={currentWorkspaceId}
          projectsCount={projectsCount}
          modelsCount={modelsCount}
          pendingInvitesCount={pendingInvitesCount}
          onWorkspaceChange={handleWorkspaceChange}
          onCreateWorkspace={handleCreateWorkspace}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <TopNav user={user} recentAuditEvents={auditEvents} />
          <main className="flex-1 overflow-auto bg-zinc-950 p-6">
            <div className="mx-auto max-w-6xl w-full h-full relative">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
