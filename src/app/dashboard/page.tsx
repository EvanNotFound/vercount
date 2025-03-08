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
        <div className="max-w-6xl w-full mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-6">Dashboard Overview</h1>
          
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Page Views</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">
                  {domainsLoading ? <Skeleton className="h-7 w-10" /> : stats.totalPageViews.toLocaleString()}
                  </div>
                  <div className="p-2 bg-primary/10 rounded-full">
                    <BarChart3 className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center">
                    {domainsLoading ? <Skeleton className="h-4 w-24" /> : `Across ${stats.totalDomains} domains`}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Unique Visitors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">
                  {domainsLoading ? <Skeleton className="h-7 w-10" /> : stats.totalUniqueVisitors.toLocaleString()}
                  </div>
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center">
                  {domainsLoading ? <Skeleton className="h-4 w-24" /> : `Across ${stats.totalDomains} domains`}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Domains</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">
                    {domainsLoading ? <Skeleton className="h-7 w-10" /> : stats.totalDomains}
                  </div>
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Globe className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {domainsLoading ? <Skeleton className="h-4 w-24" /> : `${stats.totalDomains} active domains`}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Monitored Pages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">
                    {domainsLoading ? <Skeleton className="h-7 w-10" /> : stats.totalMonitoredPages}
                  </div>
                  <div className="p-2 bg-primary/10 rounded-full">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {domainsLoading ? <Skeleton className="h-4 w-24" /> : `Across ${stats.totalDomains} domains`}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Recent activity and top pages */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Recently viewed pages across all domains</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {domainsLoading ? (
                    Array(4).fill(0).map((_, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex flex-col gap-0">
                          <Skeleton className="h-5 w-32 mb-1" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-5 w-20" />
                        </div>
                      </div>
                    ))
                  ) : (
                    stats.recentActivity.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex flex-col gap-0">
                          <div className="">{item.domain}</div>
                          <div className="text-sm text-muted-foreground">{item.path}</div>
                        </div>
                        <div className="font-medium">{item.views} views</div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Top Pages</CardTitle>
                <CardDescription>Most viewed pages across all domains</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {domainsLoading ? (
                    Array(4).fill(0).map((_, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex flex-col gap-0">
                          <Skeleton className="h-5 w-32 mb-1" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                        <Skeleton className="h-5 w-20" />
                      </div>
                    ))
                  ) : (
                    stats.topPages.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex flex-col gap-0">
                          <div className="">{item.domain}</div>
                          <div className="text-sm text-muted-foreground">{item.path}</div>
                        </div>
                        <div className="font-medium">{item.views.toLocaleString()} views</div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Quick actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks you might want to perform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => router.push('/dashboard/domains')}>
                  Manage Domains
                </Button>
                <Button onClick={() => router.push('/dashboard/counters')} variant="outline">
                  Update Counters
                </Button>
                <Button onClick={() => router.push('/dashboard/analytics')} variant="outline">
                  View Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 