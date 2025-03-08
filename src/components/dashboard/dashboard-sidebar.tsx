"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Globe,
  LayoutDashboard,
  Settings,
  PieChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";

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
      label: "Domains",
      icon: <Globe className="h-4 w-4" />,
    },
    {
      href: "/dashboard/analytics",
      label: "Analytics",
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
        <Link href="/" className="flex items-center px-4 py-5">
          <span className="font-semibold text-lg tracking-tight">Vercount</span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-3">
        <nav className="space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                pathname === item.href
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        
        {/* <div className="mt-8">
          <div className="px-3 text-xs uppercase tracking-wider text-muted-foreground/70 mb-2">
            Settings
          </div>
          <nav className="space-y-0.5">
            {settingsItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  pathname === item.href
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div> */}
      </SidebarContent>
      <SidebarFooter className="border-t">
        <SidebarUserInfo />
      </SidebarFooter>
    </Sidebar>
  );
}
  