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

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import SidebarUserInfo from "./sidebar-user-info";

export function DashboardSidebar() {
  const pathname = usePathname();

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
        <SidebarUserInfo />
      </SidebarFooter>
    </Sidebar>
  );
}
  