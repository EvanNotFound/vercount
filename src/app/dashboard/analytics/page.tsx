"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { HomeIcon, ArrowLeft, RefreshCw, Download } from "lucide-react";
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
  const { data: session, isPending } = useSession();
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
    syncing: false,
    syncingBusuanzi: false
  });
  const [monitoredPaths, setMonitoredPaths] = useState<string[]>([]);
  const [newPagePath, setNewPagePath] = useState<string>("");

  // Redirect if not authenticated
  useEffect(() => {
    fetchDomains();
  }, []);

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
        fetch(`/api/domains/analytics?domain=${domainName}`),
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
      
      const response = await fetch("/api/domains/analytics", {
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

  // Sync data from Busuanzi (force re-sync)
  const syncFromBusuanzi = async () => {
    if (!selectedDomain) return;
    
    try {
      setLoading(prev => ({ ...prev, syncingBusuanzi: true }));
      
      const response = await fetch("/api/domains/sync-busuanzi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domainName: selectedDomain.name,
        }),
      });
      
      const resData = await response.json();
      
      if (resData.status === "success" && resData.data?.synced) {
        toast.success("Data synced from Busuanzi successfully");
        // Reload domain data to reflect the new values
        await loadDomainData(selectedDomain.name);
      } else if (resData.status === "success" && !resData.data?.synced) {
        // Partial failure
        toast.warning(resData.message || "Some data failed to sync from Busuanzi");
        // Still reload to show any data that was synced
        await loadDomainData(selectedDomain.name);
      } else {
        toast.error(resData.message || "Failed to sync from Busuanzi");
      }
    } catch (error) {
      console.error("Error syncing from Busuanzi:", error);
      toast.error("Failed to sync from Busuanzi. Please try again later.");
    } finally {
      setLoading(prev => ({ ...prev, syncingBusuanzi: false }));
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
        <div className="max-w-5xl w-full mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Analytics</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push('/dashboard')}>
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
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Sync
                </Button>
              )}
            </div>
          </div>
          
          {/* Domain selection */}
          <div className="mb-8">
            <h2 className="text-lg font-medium mb-4">Select Domain</h2>
            
            {loading.domains ? (
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-32" />
                ))}
              </div>
            ) : domains.length === 0 ? (
              <div className="border border-dashed rounded-lg p-8 text-center bg-secondary/2">
                <p className="text-muted-foreground mb-4">No verified domains found.</p>
                <Button onClick={() => router.push('/dashboard/domains')}>
                  Add a Domain
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {domains.map((domain) => (
                  <Button
                    key={domain.id}
                    variant={selectedDomain?.id === domain.id ? "default" : "outline"}
                    onClick={() => selectDomain(domain)}
                    className={`h-auto py-2 px-4 ${selectedDomain?.id === domain.id ? "" : "hover:bg-secondary/20"}`}
                    disabled={!domain.verified}
                  >
                    {domain.name}
                    {!domain.verified && <span className="ml-2 text-xs opacity-70">(Unverified)</span>}
                  </Button>
                ))}
              </div>
            )}
          </div>
          
          {/* Counters section */}
          {selectedDomain ? (
            <div className="space-y-8">
              {/* Domain header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-medium">{selectedDomain.name}</h2>
                <Button 
                  onClick={saveCounters}
                  disabled={loading.saving}
                  className="h-9"
                >
                  {loading.saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>

              {/* Site-wide analytics */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground">SITE OVERVIEW</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={syncFromBusuanzi}
                    disabled={loading.syncingBusuanzi}
                    title="Force re-sync data from Busuanzi service"
                  >
                    {loading.syncingBusuanzi ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    {loading.syncingBusuanzi ? "Syncing..." : "Sync from Busuanzi"}
                  </Button>
                </div>
                
                {loading.counters ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="border rounded-lg p-5 bg-secondary/10 hover:bg-secondary/15 transition-colors">
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="text-sm font-medium text-muted-foreground">Page Views</h3>
                      </div>
                      <div className="text-3xl font-semibold mb-4">{counterData.sitePv.toLocaleString()}</div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={counterData.sitePv}
                          onChange={(e) => {
                            const numValue = parseInt(e.target.value, 10);
                            updateSiteCounter('sitePv', isNaN(numValue) ? 0 : numValue);
                          }}
                          className="h-8 bg-background/80"
                        />
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-5 bg-secondary/10 hover:bg-secondary/15 transition-colors">
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="text-sm font-medium text-muted-foreground">Unique Visitors</h3>
                      </div>
                      <div className="text-3xl font-semibold mb-4">{counterData.siteUv.toLocaleString()}</div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={counterData.siteUv}
                          onChange={(e) => {
                            const numValue = parseInt(e.target.value, 10);
                            updateSiteCounter('siteUv', isNaN(numValue) ? 0 : numValue);
                          }}
                          className="h-8 bg-background/80"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Page-specific analytics */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    PAGE ANALYTICS
                    {Object.keys(counterData.pageViews).length > 0 && (
                      <span className="ml-1 text-xs">
                        ({Object.keys(counterData.pageViews).length} pages)
                      </span>
                    )}
                  </h3>
                </div>
                
                {loading.counters ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-40 w-full" />
                  </div>
                ) : (
                  <div>
                    {Object.keys(counterData.pageViews).length === 0 ? (
                      <div className="border border-dashed rounded-lg p-8 text-center bg-secondary/2">
                        <p className="text-muted-foreground mb-4">No monitored pages found for this domain.</p>
                        <Button variant="outline" onClick={syncPathsFromKV} size="sm">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Sync Paths
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <CounterTable
                          data={Object.entries(counterData.pageViews).map(([path, views]) => ({
                            path,
                            views,
                          }))}
                          handlePageViewChange={(path, value) => updatePageView(path, value)}
                          handleUpdatePageView={handleUpdatePageViewDummy}
                          handleDeleteMonitoredPage={deleteMonitoredPage}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="border border-dashed rounded-lg p-12 text-center bg-secondary/2">
              {loading.domains ? (
                <div className="flex flex-col items-center">
                  <Skeleton className="h-6 w-64 mb-4" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-medium mb-2">Select a domain to view analytics</h3>
                  <p className="text-muted-foreground mb-4">Choose a domain from the list above to view and update its analytics.</p>
                  {domains.length === 0 && (
                    <Button onClick={() => router.push('/dashboard/domains')}>
                      Add a Domain
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 