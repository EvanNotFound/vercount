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

// Types
interface Domain {
  id: string;
  name: string;
  verified: boolean;
  verificationCode: string;
  createdAt: string;
  updatedAt: string;
  monitoredPages: MonitoredPage[];
  counters?: {
    sitePv: number;
    siteUv: number;
    pageViews: PageViewData[];
  };
}

interface MonitoredPage {
  id: string;
  path: string;
  createdAt: string;
  updatedAt: string;
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

  // Dummy data for statistics
  const [stats, setStats] = useState({
    totalPageViews: 12487,
    totalUniqueVisitors: 3254,
    totalDomains: 0,
    totalMonitoredPages: 0,
    recentActivity: [
      { domain: "example.com", path: "/", views: 245, change: "+12%" },
      { domain: "mysite.org", path: "/blog", views: 187, change: "+8%" },
      { domain: "example.com", path: "/products", views: 132, change: "+5%" },
      { domain: "mysite.org", path: "/about", views: 98, change: "-3%" },
    ],
    topPages: [
      { domain: "example.com", path: "/", views: 3245 },
      { domain: "mysite.org", path: "/blog", views: 2187 },
      { domain: "example.com", path: "/products", views: 1932 },
      { domain: "mysite.org", path: "/about", views: 1098 },
    ]
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
      domains.forEach(domain => {
        totalPages += domain.monitoredPages.length;
      });
      
      setStats(prev => ({
        ...prev,
        totalDomains: domains.length,
        totalMonitoredPages: totalPages
      }));
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
      
      const data = await response.json();
      
      if (data.success) {
        setDomains(data.domains);
      }
    } catch (error) {
      console.error("Error fetching domains:", error);
      toast.error("Failed to load domains");
    } finally {
      setDomainsLoading(false);
    }
  };

  // Rest of your existing functions...
  // ... (keep all the existing functions)

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
                  <div className="text-2xl font-bold">{stats.totalPageViews.toLocaleString()}</div>
                  <div className="p-2 bg-primary/10 rounded-full">
                    <BarChart3 className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center">
                  <ArrowUpRight className="h-3 w-3 mr-1 text-green-500" />
                  <span className="text-green-500 font-medium">+14%</span>
                  <span className="ml-1">from last month</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Unique Visitors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">{stats.totalUniqueVisitors.toLocaleString()}</div>
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center">
                  <ArrowUpRight className="h-3 w-3 mr-1 text-green-500" />
                  <span className="text-green-500 font-medium">+8%</span>
                  <span className="ml-1">from last month</span>
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
                <CardDescription>Page view changes in the last 24 hours</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {domainsLoading ? (
                    Array(4).fill(0).map((_, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div>
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
                        <div>
                          <div className="font-medium">{item.domain}</div>
                          <div className="text-sm text-muted-foreground">{item.path}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{item.views} views</div>
                          <div className={`text-xs ${item.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                            {item.change}
                          </div>
                        </div>
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
                        <div>
                          <Skeleton className="h-5 w-32 mb-1" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                        <Skeleton className="h-5 w-20" />
                      </div>
                    ))
                  ) : (
                    stats.topPages.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{item.domain}</div>
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