import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TopNav } from "@/components/top-nav";
import { syncUser } from "@/lib/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, getUser } = getKindeServerSession();
  
  if (!(await isAuthenticated())) {
    redirect("/");
  }

  // Ensure Kinde user is synced into Neon DB
  await syncUser();

  const user = await getUser();

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-zinc-950 text-zinc-50 overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopNav user={user} />
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
