import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

export const metadata: Metadata = {
	title: "Dashboard | Vercount",
	description: "Manage your website statistics",
};

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await getServerSession(authOptions);

	if (!session) {
		redirect("/auth/signin");
	}

	return (
		<SidebarProvider defaultOpen={true}>
      <div className="flex h-screen overflow-hidden w-full">
        <DashboardSidebar />
        <div className="flex flex-col flex-1 overflow-auto w-full">
          <div className="flex-1 flex flex-col">
            <SidebarTrigger className="fixed right-4 top-4 z-50 md:hidden p-3 bg-zinc-900 rounded-md" />
            {children}
          </div>
        </div>
      </div>
		</SidebarProvider>
	);
}
