"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { HomeIcon, ArrowLeft } from "lucide-react";
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

export default function CountersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const domainParam = searchParams.get('domain');
  
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [sitePv, setSitePv] = useState<number>(0);
  const [siteUv, setSiteUv] = useState<number>(0);
  const [pageViewUpdates, setPageViewUpdates] = useState<Record<string, number>>({});
  const [domainsLoading, setDomainsLoading] = useState(true);
  const [updatingCounters, setUpdatingCounters] = useState(false);
  const [updatingPageView, setUpdatingPageView] = useState<string | null>(null);

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

  // Select domain from URL parameter
  useEffect(() => {
    if (domains.length > 0 && domainParam) {
      const domain = domains.find(d => d.name === domainParam);
      if (domain) {
        handleSelectDomain(domain);
      }
    }
  }, [domains, domainParam]);

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

  // Handle domain selection
  const handleSelectDomain = (domain: Domain) => {
    setSelectedDomain(domain);
    
    // Initialize counters
    if (domain.counters) {
      setSitePv(domain.counters.sitePv);
      setSiteUv(domain.counters.siteUv);
      
      // Initialize page view updates
      const initialPageViews: Record<string, number> = {};
      domain.counters.pageViews.forEach(pv => {
        initialPageViews[pv.path] = pv.views;
      });
      setPageViewUpdates(initialPageViews);
    } else {
      setSitePv(0);
      setSiteUv(0);
      setPageViewUpdates({});
    }
  };

  // Update counters
  const handleUpdateCounters = async () => {
    if (!selectedDomain) return;
    
    try {
      setUpdatingCounters(true);
      const response = await fetch(`/api/domains/${selectedDomain.id}/counters`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sitePv,
          siteUv,
          pageViews: Object.entries(pageViewUpdates).map(([path, views]) => ({
            path,
            views,
          })),
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success("Counters updated successfully");
        fetchDomains(); // Refresh data
      } else {
        toast.error(data.message || "Failed to update counters");
      }
    } catch (error) {
      console.error("Error updating counters:", error);
      toast.error("Failed to update counters");
    } finally {
      setUpdatingCounters(false);
    }
  };

  // Update a single page view
  const handleUpdatePageView = async (path: string) => {
    if (!selectedDomain) return;
    
    try {
      setUpdatingPageView(path);
      const response = await fetch(`/api/domains/${selectedDomain.id}/pageview`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path,
          views: pageViewUpdates[path] || 0,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Page view for ${path} updated`);
        fetchDomains(); // Refresh data
      } else {
        toast.error(data.message || "Failed to update page view");
      }
    } catch (error) {
      console.error("Error updating page view:", error);
      toast.error("Failed to update page view");
    } finally {
      setUpdatingPageView(null);
    }
  };

  // Handle page view input change
  const handlePageViewChange = (path: string, value: number) => {
    setPageViewUpdates((prev) => ({
      ...prev,
      [path]: value,
    }));
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Breadcrumb header */}
      <DashboardHeader items={[
        { label: "Home", href: "/", icon: HomeIcon },
        { label: "Dashboard", href: "/dashboard" },
        { label: "Counters" },
      ]} />

      {/* Main content */}
      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-6xl w-full mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl md:text-3xl font-bold">Update Counters</h1>
            <Button onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          
          {/* Domain selection */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Select Domain</CardTitle>
              <CardDescription>Choose a domain to update its counters</CardDescription>
            </CardHeader>
            <CardContent>
              {domainsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <div className="flex gap-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-10 w-24" />
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
                    {domains.map((domain) => (
                      <Button
                        key={domain.id}
                        variant={selectedDomain?.id === domain.id ? "default" : "outline"}
                        onClick={() => handleSelectDomain(domain)}
                        className="justify-start overflow-hidden"
                      >
                        <span className="truncate">{domain.name}</span>
                      </Button>
                    ))}
                  </div>
                  {domains.length === 0 && (
                    <p className="text-muted-foreground">No domains found. Add a domain first.</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          
          {/* Counters form */}
          {selectedDomain ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Site Counters for {selectedDomain.name}</CardTitle>
                  <CardDescription>Update site-wide counters</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label htmlFor="site-pv">Site Page Views</Label>
                      <Input
                        id="site-pv"
                        type="number"
                        value={sitePv}
                        onChange={(e) => setSitePv(parseInt(e.target.value) || 0)}
                        min="0"
                        disabled={updatingCounters}
                      />
                    </div>
                    <div>
                      <Label htmlFor="site-uv">Site Unique Visitors</Label>
                      <Input
                        id="site-uv"
                        type="number"
                        value={siteUv}
                        onChange={(e) => setSiteUv(parseInt(e.target.value) || 0)}
                        min="0"
                        disabled={updatingCounters}
                      />
                    </div>
                  </div>
                  <Button onClick={handleUpdateCounters} disabled={updatingCounters}>
                    {updatingCounters ? "Updating..." : "Update Site Counters"}
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Page View Counters</CardTitle>
                  <CardDescription>Update page-specific view counters</CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedDomain.monitoredPages.length === 0 ? (
                    <p className="text-muted-foreground">No monitored pages found for this domain.</p>
                  ) : (
                    <div className="space-y-4">
                      {selectedDomain.monitoredPages.map((page) => (
                        <div key={page.id} className="flex flex-col md:flex-row gap-2 items-start md:items-end">
                          <div className="flex-1">
                            <Label htmlFor={`page-${page.id}`}>{page.path}</Label>
                            <Input
                              id={`page-${page.id}`}
                              type="number"
                              value={pageViewUpdates[page.path] || 0}
                              onChange={(e) => handlePageViewChange(page.path, parseInt(e.target.value) || 0)}
                              min="0"
                              disabled={updatingPageView === page.path}
                            />
                          </div>
                          <Button 
                            variant="outline" 
                            onClick={() => handleUpdatePageView(page.path)}
                            disabled={updatingPageView === page.path}
                          >
                            {updatingPageView === page.path ? "Updating..." : "Update"}
                          </Button>
                        </div>
                      ))}
                      
                      <div className="pt-4 border-t">
                        <Button onClick={handleUpdateCounters} disabled={updatingCounters}>
                          {updatingCounters ? "Updating All..." : "Update All Page Counters"}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                {domainsLoading ? (
                  <div className="space-y-4 flex flex-col items-center">
                    <Skeleton className="h-6 w-64" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                ) : (
                  <>
                    <h3 className="text-lg font-medium mb-2">No Domain Selected</h3>
                    <p className="text-muted-foreground mb-4">Please select a domain to update its counters.</p>
                    {domains.length === 0 && (
                      <Button onClick={() => router.push('/dashboard/domains')}>
                        Add a Domain
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 