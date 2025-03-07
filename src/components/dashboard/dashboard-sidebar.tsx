"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Globe,
  LayoutDashboard,
  Settings,
  Users,
  LogOut,
  User,
  ChevronUp,
  LineChart,
  ListFilter,
  PieChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession } from "next-auth/react";

export function DashboardSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  
  const navItems = [
    {
      href: "/dashboard",
      label: "Overview",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      href: "/dashboard/domains",
      label: "My Domains",
      icon: <Globe className="h-4 w-4" />,
    },
    {
      href: "/dashboard/analytics",
      label: "Analytics",
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      href: "/dashboard/counters",
      label: "Manage Counters",
      icon: <PieChart className="h-4 w-4" />,
    },
  ];
  
  const settingsItems = [
    {
      href: "/dashboard/settings",
      label: "Settings",
      icon: <Settings className="h-4 w-4" />,
    },
  ];
  
  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2 px-4 py-3">
          <span className="font-bold text-xl tracking-tighter">Vercount</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <nav className="space-y-1 px-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                pathname === item.href
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        
        <div className="mt-6">
          <div className="px-3 text-xs font-medium text-muted-foreground mb-2">
            Settings
          </div>
          <nav className="space-y-1 px-2">
            {settingsItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  pathname === item.href
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 py-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full focus:outline-none">
              <div className="flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session?.user?.image || ""} alt="User" />
                    <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
                      {session?.user?.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{session?.user?.name}</span>
                    <span className="text-xs text-muted-foreground">{session?.user?.email}</span>
                  </div>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-xs font-medium text-muted-foreground">Signed in as</p>
                <p className="text-sm font-medium">{session?.user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
              <div className="flex items-center justify-center px-4 py-2 text-xs text-muted-foreground">
                <span>© {new Date().getFullYear()} Vercount</span>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {/* <div className="flex items-center justify-center px-4 py-2 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Vercount</span>
        </div> */}
      </SidebarFooter>
    </Sidebar>
  );
}
  