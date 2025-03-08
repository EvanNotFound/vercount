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
import { HomeIcon, ArrowLeft, RefreshCw } from "lucide-react";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import { safeDecodeURIComponent } from "@/utils/url";
import { CounterTable } from "@/components/data-table/counter-table";
import { Domain, PageViewData } from "@/types/domain";

// Define types for our state
interface CounterData {
  sitePv: number;
  siteUv: number;
  pageViews: Record<string, number>;
}

export default function CountersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const domainParam = searchParams.get('domain');
  
  // Simplified state management
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [counterData, setCounterData] = useState<CounterData>({
    sitePv: 0,
    siteUv: 0,
    pageViews: {}
  });
  const [loading, setLoading] = useState({
    domains: true,
    counters: false,
    saving: false,
    syncing: false
  });
  const [monitoredPaths, setMonitoredPaths] = useState<string[]>([]);
  const [newPagePath, setNewPagePath] = useState<string>("");

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Fetch domains on initial load
  useEffect(() => {
    if (status === "authenticated") {
      fetchDomains();
    }
  }, [status]);

  // Select domain from URL parameter
  useEffect(() => {
    if (domains.length > 0 && domainParam) {
      const domain = domains.find((d: Domain) => d.name === domainParam);
      if (domain) {
        selectDomain(domain);
      }
    }
  }, [domains, domainParam]);

  // Fetch domains from API
  const fetchDomains = async () => {
    try {
      setLoading(prev => ({ ...prev, domains: true }));
      const response = await fetch("/api/domains");
      
      if (!response.ok) {
        throw new Error("Failed to fetch domains");
      }
      
      const resData = await response.json();
      
      if (resData.status === "success") {
        setDomains(resData.data.domains || []);
      }
    } catch (error) {
      console.error("Error fetching domains:", error);
      toast.error("Failed to load domains");
    } finally {
      setLoading(prev => ({ ...prev, domains: false }));
    }
  };

  // Select a domain and load its data
  const selectDomain = async (domain: Domain) => {
    setSelectedDomain(domain);
    loadDomainData(domain.name);
  };

  // Load all domain data in a single function
  const loadDomainData = async (domainName: string) => {
    try {
      setLoading(prev => ({ ...prev, counters: true }));
      
      // Fetch both counters and paths in parallel
      const [countersResponse, pathsResponse] = await Promise.all([
        fetch(`/api/domains/counters?domain=${domainName}`),
        fetch(`/api/domains/pages?domain=${domainName}`)
      ]);
      
      if (!countersResponse.ok || !pathsResponse.ok) {
        throw new Error("Failed to fetch domain data");
      }
      
      const countersData = await countersResponse.json();
      const pathsData = await pathsResponse.json();
      
      if (countersData.status === "success" && pathsData.status === "success") {
        // Process counter data
        const counters = countersData.data.counters;
        
        // Convert page views array to a record for easier updates
        const pageViewsRecord: Record<string, number> = {};
        if (Array.isArray(counters.pageViews)) {
          counters.pageViews.forEach((pv: { path: string; views: number }) => {
            pageViewsRecord[pv.path] = pv.views || 0;
          });
        }
        
        // Get paths from the paths API
        const paths = pathsData.data.paths || [];
        
        // Create a mapping of original to decoded paths if available
        const pathMapping: Record<string, string> = {};
        if (pathsData.data.decodedPaths && Array.isArray(pathsData.data.decodedPaths)) {
          pathsData.data.decodedPaths.forEach((item: { original: string; decoded: string }) => {
            pathMapping[item.original] = item.decoded;
          });
        }
        
        // Make sure all paths from KV are in the pageViews record
        // If a path exists in KV but not in counters, initialize it with 0 views
        paths.forEach((path: string) => {
          if (!pageViewsRecord[path]) {
            pageViewsRecord[path] = 0;
          }
        });
        
        // Update state with all data
        setCounterData({
          sitePv: counters.sitePv || 0,
          siteUv: counters.siteUv || 0,
          pageViews: pageViewsRecord
        });
        
        // Store monitored paths
        setMonitoredPaths(paths);
        
        console.log('Loaded paths:', paths);
        console.log('Decoded paths mapping:', pathMapping);
      }
    } catch (error) {
      console.error("Error loading domain data:", error);
      toast.error("Failed to load domain data");
    } finally {
      setLoading(prev => ({ ...prev, counters: false }));
    }
  };

  // Save all counter changes
  const saveCounters = async () => {
    if (!selectedDomain) return;
    
    try {
      setLoading(prev => ({ ...prev, saving: true }));
      
      const response = await fetch("/api/domains/counters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domainName: selectedDomain.name,
          sitePv: counterData.sitePv,
          siteUv: counterData.siteUv,
          pageViews: Object.entries(counterData.pageViews).map(([path, views]) => ({
            path,
            views,
          })),
        }),
      });
      
      const resData = await response.json();
      
      if (resData.status === "success") {
        toast.success("Counters updated successfully");
        // Refresh data to ensure UI is in sync with server
        loadDomainData(selectedDomain.name);
      } else {
        toast.error(resData.message || "Failed to update counters");
      }
    } catch (error) {
      console.error("Error saving counters:", error);
      toast.error("Failed to update counters");
    } finally {
      setLoading(prev => ({ ...prev, saving: false }));
    }
  };

  // Update site-wide counter values
  const updateSiteCounter = (field: 'sitePv' | 'siteUv', value: number) => {
    setCounterData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Update a page view counter
  const updatePageView = (path: string, value: number) => {
    // Use a callback form of setState to ensure we're working with the latest state
    setCounterData(prev => {
      // Create a new object to avoid direct mutation
      const newPageViews = { ...prev.pageViews };
      newPageViews[path] = value;
      
      return {
        ...prev,
        pageViews: newPageViews
      };
    });
  };

  // Delete a monitored page
  const deleteMonitoredPage = async (path: string) => {
    if (!selectedDomain) return;
    
    try {
      // Remove from local state first for immediate UI feedback
      setCounterData(prev => {
        const updatedPageViews = { ...prev.pageViews };
        delete updatedPageViews[path];
        return {
          ...prev,
          pageViews: updatedPageViews
        };
      });
      
      setMonitoredPaths(prev => prev.filter(p => p !== path));
      
      // Delete from server
      const response = await fetch(`/api/domains/monitored-page?domain=${selectedDomain.name}&path=${encodeURIComponent(path)}`, {
        method: "DELETE",
      });
      
      const resData = await response.json();
      
      if (resData.status === "success") {
        toast.success(`Page ${path} deleted successfully`);
      } else {
        // If server deletion fails, reload data to ensure UI is in sync
        loadDomainData(selectedDomain.name);
        toast.error(`Failed to delete page: ${resData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error deleting monitored page:", error);
      toast.error("Failed to delete page. Please try again.");
      // Reload data to ensure UI is in sync
      loadDomainData(selectedDomain.name);
    }
  };

  // Sync paths from KV
  const syncPathsFromKV = async () => {
    if (!selectedDomain) return;
    
    try {
      setLoading(prev => ({ ...prev, syncing: true }));
      // Simply reload all domain data
      await loadDomainData(selectedDomain.name);
      toast.success("Paths synced successfully");
    } catch (error) {
      console.error("Error syncing paths:", error);
      toast.error("Failed to sync paths");
    } finally {
      setLoading(prev => ({ ...prev, syncing: false }));
    }
  };

  // Dummy function for the CounterTable component
  const handleUpdatePageViewDummy = async (path: string): Promise<void> => {
    // This function is not needed in our simplified approach
    // but we need to provide it to satisfy the CounterTable props
    return Promise.resolve();
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h1 className="text-2xl md:text-3xl font-bold">Analytics Counters</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              {selectedDomain && (
                <Button 
                  variant="outline" 
                  onClick={syncPathsFromKV}
                  disabled={loading.syncing}
                >
                  {loading.syncing ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="ml-2 hidden sm:inline">Sync Paths</span>
                </Button>
              )}
            </div>
          </div>
          
          {/* Domain selection */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle>Select Domain</CardTitle>
              <CardDescription>Choose a domain to view and update its analytics data</CardDescription>
            </CardHeader>
            <CardContent>
              {loading.domains ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <div className="flex gap-2 flex-wrap">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-10 w-32" />
                    ))}
                  </div>
                </div>
              ) : domains.length === 0 ? (
                <div className="text-center py-6 space-y-4">
                  <p className="text-muted-foreground">No verified domains found.</p>
                  <Button onClick={() => router.push('/dashboard/domains')}>
                    Add a Domain
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
                    {domains.map((domain) => (
                      <Button
                        key={domain.id}
                        variant={selectedDomain?.id === domain.id ? "default" : "outline"}
                        onClick={() => selectDomain(domain)}
                        className="justify-start overflow-hidden h-auto py-3"
                        disabled={!domain.verified}
                      >
                        <div className="truncate">
                          {domain.name}
                          {!domain.verified && <span className="ml-2 text-xs text-muted-foreground">(Unverified)</span>}
                        </div>
                      </Button>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          {/* Counters section */}
          {selectedDomain ? (
            <div className="space-y-6">
              {/* Site-wide analytics card */}
              <Card>
                <CardHeader>
                  <CardTitle>Site-wide Analytics for {selectedDomain.name}</CardTitle>
                  <CardDescription>Overall analytics for your entire domain</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading.counters ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="border rounded-lg p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-medium">Page Views</h3>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Site-wide</span>
                        </div>
                        <div className="text-3xl font-bold mb-4">{counterData.sitePv.toLocaleString()}</div>
                        <div className="mt-auto">
                          <Label htmlFor="sitePv" className="text-sm text-muted-foreground mb-1 block">
                            Update count:
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="sitePv"
                              type="number"
                              min="0"
                              step="1"
                              value={counterData.sitePv}
                              onChange={(e) => {
                                const numValue = parseInt(e.target.value, 10);
                                updateSiteCounter('sitePv', isNaN(numValue) ? 0 : numValue);
                              }}
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="border rounded-lg p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-medium">Unique Visitors</h3>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Site-wide</span>
                        </div>
                        <div className="text-3xl font-bold mb-4">{counterData.siteUv.toLocaleString()}</div>
                        <div className="mt-auto">
                          <Label htmlFor="siteUv" className="text-sm text-muted-foreground mb-1 block">
                            Update count:
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="siteUv"
                              type="number"
                              min="0"
                              step="1"
                              value={counterData.siteUv}
                              onChange={(e) => {
                                const numValue = parseInt(e.target.value, 10);
                                updateSiteCounter('siteUv', isNaN(numValue) ? 0 : numValue);
                              }}
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Page-specific analytics card */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle>Page-specific Analytics</CardTitle>
                      <CardDescription>
                        View and update analytics for individual pages
                        {Object.keys(counterData.pageViews).length > 0 && (
                          <span className="ml-1">
                            ({Object.keys(counterData.pageViews).length} pages)
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading.counters ? (
                    <div className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-40 w-full" />
                    </div>
                  ) : (
                    <div>
                      {Object.keys(counterData.pageViews).length === 0 ? (
                        <div className="border rounded-md p-8 text-center space-y-4">
                          <p className="text-muted-foreground">No monitored pages found for this domain.</p>
                          <Button variant="outline" onClick={syncPathsFromKV}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Sync Paths from KV
                          </Button>
                        </div>
                      ) : (
                        <CounterTable
                          data={Object.entries(counterData.pageViews).map(([path, views]) => ({
                            path,
                            views,
                          }))}
                          handlePageViewChange={(path, value) => updatePageView(path, value)}
                          handleUpdatePageView={handleUpdatePageViewDummy}
                          handleDeleteMonitoredPage={deleteMonitoredPage}
                        />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Save button */}
              <div className="flex justify-end mt-6">
                <Button 
                  onClick={saveCounters}
                  disabled={loading.saving}
                  size="lg"
                  className="px-8"
                >
                  {loading.saving ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    "Save All Changes"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                {loading.domains ? (
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