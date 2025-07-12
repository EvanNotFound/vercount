"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { HomeIcon, ArrowUpRight, Users, Globe, BarChart3, TrendingUp } from "lucide-react";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import { safeDecodeURIComponent } from "@/utils/url"; 
import { SiGithub } from "@icons-pack/react-simple-icons";
// Types
interface Domain {
  id: string;
  name: string;
  verified: boolean;
  verificationCode: string;
  createdAt: string;
  updatedAt: string;
  counters?: {
    sitePv: number;
    siteUv: number;
    pageViews: PageViewData[];
  };
}


interface PageViewData {
  path: string;
  views: number;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [domainsLoading, setDomainsLoading] = useState(true);

  // Stats state with real data structure
  const [stats, setStats] = useState({
    totalPageViews: 0,
    totalUniqueVisitors: 0,
    totalDomains: 0,
    totalMonitoredPages: 0,
    recentActivity: [] as { domain: string; path: string; views: number }[],
    topPages: [] as { domain: string; path: string; views: number }[]
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Fetch domains
  useEffect(() => {
    if (status === "authenticated") {
      fetchDomains();
    }
  }, [status]);

  // Update stats based on fetched domains
  useEffect(() => {
    if (domains.length > 0) {
      let totalPages = 0;
      let totalPageViews = 0;
      let totalUniqueVisitors = 0;
      const recentActivity: { domain: string; path: string; views: number }[] = [];
      const allPages: { domain: string; path: string; views: number }[] = [];
      
      domains.forEach(domain => {
        // Count total monitored pages from pageViews instead of monitoredPages
        const pageViewsCount = domain.counters?.pageViews?.length || 0;
        totalPages += pageViewsCount;
        
        // Sum up page views and unique visitors
        if (domain.counters) {
          totalPageViews += domain.counters.sitePv;
          totalUniqueVisitors += domain.counters.siteUv;
          
          // Process page views data for each domain
          domain.counters.pageViews.forEach((pageView) => {
            // Use the path directly from the pageView data
            const path = pageView.path;
            
            // Add to all pages for sorting later
            allPages.push({
              domain: domain.name,
              path: safeDecodeURIComponent(path),
              views: pageView.views
            });
            
            // Add to recent activity (without change percentage)
            if (recentActivity.length < 4) {
              recentActivity.push({
                domain: domain.name,
                path: safeDecodeURIComponent(path),
                views: pageView.views
              });
            }
          });
        }
      });
      
      // Sort pages by views and get top 4
      const topPages = allPages
        .sort((a, b) => b.views - a.views)
        .slice(0, 4);
      
      setStats({
        totalPageViews,
        totalUniqueVisitors,
        totalDomains: domains.length,
        totalMonitoredPages: totalPages,
        recentActivity,
        topPages
      });
    }
  }, [domains]);

  // Fetch domains from API
  const fetchDomains = async () => {
    try {
      setDomainsLoading(true);
      const response = await fetch("/api/domains");
      
      if (!response.ok) {
        throw new Error("Failed to fetch domains");
      }
      
      const resData = await response.json();
      
      if (resData.status === "success") {
        setDomains(resData.data.domains);
      }
    } catch (error) {
      console.error("Error fetching domains:", error);
      toast.error("Failed to load domains");
    } finally {
      setDomainsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Breadcrumb header */}
      <DashboardHeader items={[
        { label: "Home", href: "/", icon: HomeIcon },
        { label: "Dashboard" },
      ]} />

      {/* Main content */}
      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-5xl w-full mx-auto">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-8">Dashboard</h1>
          
          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="border rounded-lg p-4 bg-secondary/5 hover:bg-secondary/10 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Page Views</h3>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-semibold">
                {domainsLoading ? <Skeleton className="h-7 w-16" /> : stats.totalPageViews.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {domainsLoading ? <Skeleton className="h-4 w-24" /> : `Across ${stats.totalDomains} domains`}
              </div>
            </div>
            
            <div className="border rounded-lg p-4 bg-secondary/5 hover:bg-secondary/10 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Unique Visitors</h3>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-semibold">
                {domainsLoading ? <Skeleton className="h-7 w-16" /> : stats.totalUniqueVisitors.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {domainsLoading ? <Skeleton className="h-4 w-24" /> : `Across ${stats.totalDomains} domains`}
              </div>
            </div>
            
            <div className="border rounded-lg p-4 bg-secondary/5 hover:bg-secondary/10 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Domains</h3>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-semibold">
                {domainsLoading ? <Skeleton className="h-7 w-16" /> : stats.totalDomains}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {domainsLoading ? <Skeleton className="h-4 w-24" /> : `${stats.totalDomains} active domains`}
              </div>
            </div>
            
            <div className="border rounded-lg p-4 bg-secondary/5 hover:bg-secondary/10 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Monitored Pages</h3>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-semibold">
                {domainsLoading ? <Skeleton className="h-7 w-16" /> : stats.totalMonitoredPages}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {domainsLoading ? <Skeleton className="h-4 w-24" /> : `Across ${stats.totalDomains} domains`}
              </div>
            </div>
          </div>
          
          {/* Navigation cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div 
              className="border rounded-lg p-5 bg-primary/3 hover:bg-primary/6 hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => router.push('/dashboard/domains')}
            >
              <div className="flex items-center justify-between mb-4">
                <Globe className="h-5 w-5 text-primary/80" />
                <ArrowUpRight className="h-4 w-4 text-primary/60" />
              </div>
              <h3 className="font-medium mb-1">Domains</h3>
              <p className="text-sm text-muted-foreground">Manage your domains and verification</p>
            </div>
            
            <div 
              className="border rounded-lg p-5 bg-primary/3 hover:bg-primary/6 hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => router.push('/dashboard/analytics')}
            >
              <div className="flex items-center justify-between mb-4">
                <BarChart3 className="h-5 w-5 text-primary/80" />
                <ArrowUpRight className="h-4 w-4 text-primary/60" />
              </div>
              <h3 className="font-medium mb-1">Analytics</h3>
              <p className="text-sm text-muted-foreground">Update and manage your analytics data</p>
            </div>
            
            <div 
              className="border rounded-lg p-5 bg-primary/3 hover:bg-primary/6 hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => router.push('https://github.com/evannotfound/vercount')}
            >
              <div className="flex items-center justify-between mb-4">
                <SiGithub className="h-5 w-5 text-primary/80" />
                <ArrowUpRight className="h-4 w-4 text-primary/60" />
              </div>
              <h3 className="font-medium mb-1">GitHub</h3>
              <p className="text-sm text-muted-foreground">View the source code of Vercount</p>
            </div>
          </div>
          
          {/* Recent activity and top pages */}
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-medium mb-4">Top Pages</h2>
              
              {domainsLoading ? (
                <div className="space-y-4">
                  {Array(4).fill(0).map((_, i) => (
                    <div key={i} className="border rounded-lg p-4 bg-secondary/5">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <Skeleton className="h-5 w-32 mb-1" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                        <Skeleton className="h-5 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : stats.topPages.length > 0 ? (
                <div className="space-y-2">
                  {stats.topPages.map((item, i) => (
                    <div key={i} className="border rounded-lg p-4 bg-secondary/5 hover:bg-secondary/10 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <div className="font-medium">{item.domain}</div>
                          <div className="text-sm text-muted-foreground truncate max-w-[250px] sm:max-w-[350px]">
                            {item.path}
                          </div>
                        </div>
                        <div className="text-sm font-medium">{item.views.toLocaleString()} views</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed rounded-lg p-8 text-center bg-secondary/2">
                  <p className="text-muted-foreground">No page data found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 