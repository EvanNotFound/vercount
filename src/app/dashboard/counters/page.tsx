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
import { HomeIcon, ArrowLeft, Trash2 } from "lucide-react";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import { safeDecodeURIComponent } from "@/utils/url";
import { CounterTable } from "@/components/data-table/counter-table";
import { Domain, MonitoredPage, PageViewData } from "@/types/domain";

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
  const [newPagePath, setNewPagePath] = useState<string>("");
  const [addingPage, setAddingPage] = useState(false);
  const [syncingPaths, setSyncingPaths] = useState(false);

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
      console.log("Looking for domain:", domainParam, "in domains:", domains);
      const domain = domains.find((d: Domain) => d.name === domainParam);
      if (domain) {
        console.log("Found domain:", domain);
        handleSelectDomain(domain);
      } else {
        console.log("Domain not found in domains list");
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
      
      const resData = await response.json();
      const data = resData.data;
      
      if (resData.status === "success") {
        console.log("Domains fetched:", data.domains);
        
        // Since we're not storing paths in PostgreSQL anymore,
        // initialize each domain with an empty monitoredPages array
        const domainsWithEmptyPages = data.domains.map((domain: Domain) => ({
          ...domain,
          monitoredPages: []
        }));
        
        setDomains(domainsWithEmptyPages || []);
        
        // If there's a domain parameter and domains are loaded, select it
        if (domainParam && domainsWithEmptyPages && domainsWithEmptyPages.length > 0) {
          const domain = domainsWithEmptyPages.find((d: Domain) => d.name === domainParam);
          if (domain) {
            // Just set the selected domain and call fetchDomainCounters directly
            // instead of going through handleSelectDomain to avoid duplicate API calls
            setSelectedDomain(domain);
            fetchDomainCounters(domain.name);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching domains:", error);
      toast.error("Failed to load domains");
    } finally {
      setDomainsLoading(false);
    }
  };

  // Handle domain selection
  const handleSelectDomain = async (domain: Domain) => {
    console.log("Selected domain:", domain);
    setSelectedDomain(domain);
    
    // Fetch domain counters - this will also fetch paths from KV and update the UI
    fetchDomainCounters(domain.name);
  };

  // Update counters
  const handleUpdateCounters = async () => {
    if (!selectedDomain) return;
    
    try {
      setUpdatingCounters(true);
      const response = await fetch("/api/domains/counters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domainName: selectedDomain.name,
          sitePv,
          siteUv,
          pageViews: Object.entries(pageViewUpdates).map(([path, views]) => ({
            path,
            views,
          })),
        }),
      });
      
      const resData = await response.json();
      const data = resData.data;
      console.log("Update counters response:", data);
      
      if (resData.status === "success") {
        toast.success("Counters updated successfully");
        // Refresh domain data
        fetchDomains();
        // Fetch updated counter data for the selected domain
        fetchDomainCounters(selectedDomain.name);
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
      // Add the page view to the pageViewUpdates state
      setPageViewUpdates((prev) => ({
        ...prev,
        [path]: pageViewUpdates[path] || 0,
      }));
      
      // Update all counters
      await handleUpdateCounters();
      
      toast.success(`Page view for ${path} updated`);
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

  // Add a new function to fetch domain counters
  const fetchDomainCounters = async (domainName: string) => {
    try {
      // Fetch paths from KV directly instead of calling syncPathsFromKV
      // to avoid duplicate API calls and toast notifications
      const paths = await fetchPathsFromKV(domainName);
      
      // Update the selected domain with paths from KV if we have a selected domain
      if (selectedDomain && paths.length > 0) {
        const updatedDomain = {
          ...selectedDomain,
          monitoredPages: paths.map((path: string) => ({
            id: `kv-${path}`, // Generate a fake ID since we don't store in PostgreSQL
            path,
            domainId: selectedDomain.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }))
        };
        
        setSelectedDomain(updatedDomain);
        
        // Also update the domain in the domains list
        setDomains(prevDomains => 
          prevDomains.map(d => 
            d.id === selectedDomain.id ? updatedDomain : d
          )
        );
      }
      
      // Fetch counter data
      const response = await fetch(`/api/domains/counters?domain=${domainName}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch domain counters");
      }
      
      const resData = await response.json();
      const data = resData.data;
      
      if ((resData.status === "success") && data && data.counters) {
        const counters = data.counters;
        setSitePv(counters.sitePv || 0);
        setSiteUv(counters.siteUv || 0);
        
        // Initialize page view updates
        const initialPageViews: Record<string, number> = {};
        if (Array.isArray(counters.pageViews)) {
          counters.pageViews.forEach((pv: { path: string; decodedPath?: string; views: number }) => {
            initialPageViews[pv.path] = pv.views || 0;
          });
        }
        setPageViewUpdates(initialPageViews);
      } else if (selectedDomain && selectedDomain.counters) {
        // Fallback to using counters from the domain object if API fails
        setSitePv(selectedDomain.counters.sitePv || 0);
        setSiteUv(selectedDomain.counters.siteUv || 0);
      }
    } catch (error) {
      console.error("Error fetching domain counters:", error);
      toast.error("Failed to fetch domain counters");
    }
  };

  // New function to sync paths from KV
  const syncPathsFromKV = async (domainName: string, showToast = false) => {
    try {
      // Since we're not storing paths in PostgreSQL anymore,
      // we just need to fetch the paths from KV and update the UI
      const paths = await fetchPathsFromKV(domainName);
      
      if (paths.length > 0) {
        // Only show toast when explicitly requested (e.g., when user clicks "Sync Paths" button)
        if (showToast) {
          toast.success(`Found ${paths.length} pages in KV`);
        }
        
        // Update the UI with the paths from KV
        if (selectedDomain) {
          // Create a new domain object with the paths from KV
          const updatedDomain = {
            ...selectedDomain,
            monitoredPages: paths.map((path: string) => ({
              id: `kv-${path}`, // Generate a fake ID since we don't store in PostgreSQL
              path,
              domainId: selectedDomain.id,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }))
          };
          
          // Update the selected domain
          setSelectedDomain(updatedDomain);
          
          // Also update the domain in the domains list
          setDomains(prevDomains => 
            prevDomains.map(domain => 
              domain.id === selectedDomain.id ? updatedDomain : domain
            )
          );
        }
      }
      
      return { paths };
    } catch (error) {
      console.error("Error syncing paths from KV:", error);
      if (showToast) {
        toast.error("Failed to sync paths from KV");
      }
      return { paths: [] };
    }
  };

  // Add a new function to fetch all paths from KV
  const fetchPathsFromKV = async (domainName: string) => {
    try {
      const response = await fetch(`/api/domains/pages?domain=${domainName}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch paths from KV");
      }
      
      const resData = await response.json();
      const data = resData.data;
      
      return data.paths || [];
    } catch (error) {
      console.error("Error fetching paths from KV:", error);
      toast.error("Failed to fetch paths from KV");
      return [];
    }
  };

  // Add a new monitored page
  const handleAddMonitoredPage = async () => {
    if (!selectedDomain || !newPagePath) return;
    
    try {
      setAddingPage(true);
      
      // Normalize the path
      let path = newPagePath;
      if (!path.startsWith('/')) {
        path = '/' + path;
      }
      
      // Add the page to the pageViewUpdates state with 0 views
      setPageViewUpdates((prev) => ({
        ...prev,
        [path]: 0,
      }));
      
      // Update all counters to save the new page to KV
      await handleUpdateCounters();
      
      // After updating counters, refresh the paths from KV
      await syncPathsFromKV(selectedDomain.name);
      
      // Clear the input
      setNewPagePath("");
      
      toast.success(`Page ${path} added successfully`);
    } catch (error) {
      console.error("Error adding monitored page:", error);
      toast.error("Failed to add monitored page");
    } finally {
      setAddingPage(false);
    }
  };

  // Delete a monitored page
  const handleDeleteMonitoredPage = async (path: string) => {
    if (!selectedDomain) return;
    
    try {
      setUpdatingPageView(path);
      
      // Remove the page from the pageViewUpdates state
      const updatedPageViews = { ...pageViewUpdates };
      delete updatedPageViews[path];
      setPageViewUpdates(updatedPageViews);
      
      // Delete the monitored page directly from KV
      const response = await fetch(`/api/domains/monitored-page?domain=${selectedDomain.name}&path=${encodeURIComponent(path)}`, {
        method: "DELETE",
      });
      
      const resData = await response.json();
      
      if (resData.status === "success") {
        toast.success(`Page ${path} deleted successfully`);
        // Refresh domain data
        fetchDomains();
        // Also refresh paths from KV to ensure UI is in sync
        fetchPathsFromKV(selectedDomain.name);
      } else {
        toast.error(`Failed to delete page: ${resData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error deleting monitored page:", error);
      toast.error("Failed to delete page. Please try again.");
    } finally {
      setUpdatingPageView("");
    }
  };

  // Add a function to manually sync paths from KV
  const handleSyncPathsFromKV = async () => {
    if (!selectedDomain) return;
    
    try {
      setSyncingPaths(true);
      // Pass true to show toast notifications since this is a user-initiated action
      await syncPathsFromKV(selectedDomain.name, true);
      // No need to call fetchDomainCounters here as syncPathsFromKV already updates the UI
    } catch (error) {
      console.error("Error syncing paths from KV:", error);
      toast.error("Failed to sync paths from KV");
    } finally {
      setSyncingPaths(false);
    }
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
            <h1 className="text-2xl md:text-3xl font-bold">Analytics Counters</h1>
            <Button onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          
          {/* Domain selection */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Select Domain</CardTitle>
              <CardDescription>Choose a domain to view and update its analytics data</CardDescription>
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
              ) : domains.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No verified domains found. Please verify a domain first.
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
                        disabled={!domain.verified}
                      >
                        <div className="truncate">
                          {domain.name}
                          {!domain.verified && <span className="ml-2 text-xs text-muted-foreground">(Unverified)</span>}
                        </div>
                      </Button>
                    ))}
                  </div>
                  {selectedDomain && (
                    <div className="text-sm text-muted-foreground">
                      Selected domain: <span className="font-medium">{selectedDomain.name}</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          
          {/* Counters form - Consolidated UI */}
          {selectedDomain ? (
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Analytics for {selectedDomain.name}</CardTitle>
                    <CardDescription>View and update analytics data for this domain</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleSyncPathsFromKV}
                    disabled={syncingPaths}
                  >
                    {syncingPaths ? "Syncing..." : "Sync Paths from KV"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Site-wide counters */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Site-wide Analytics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <Label htmlFor="sitePv">Site Page Views</Label>
                        <Input
                          id="sitePv"
                          type="number"
                          min="0"
                          value={sitePv}
                          onChange={(e) => setSitePv(Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="siteUv">Site Unique Visitors</Label>
                        <Input
                          id="siteUv"
                          type="number"
                          min="0"
                          value={siteUv}
                          onChange={(e) => setSiteUv(Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Page-specific counters - Using the new data table component */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium">Page-specific Analytics</h3>
                    </div>
                    
                    {/* Page views data table */}
                    {Object.keys(pageViewUpdates).length === 0 ? (
                      <div className="border rounded-md px-4 py-3 text-center text-muted-foreground">
                        No monitored pages. Use &quot;Sync Paths from KV&quot; to import pages.
                      </div>
                    ) : (
                      <CounterTable
                        data={Object.entries(pageViewUpdates).map(([path, views]) => ({
                          path,
                          views,
                        }))}
                        handlePageViewChange={handlePageViewChange}
                        handleUpdatePageView={handleUpdatePageView}
                        handleDeleteMonitoredPage={handleDeleteMonitoredPage}
                      />
                    )}
                  </div>

                  {/* Update button - Prominently placed at the bottom */}
                  <div className="flex justify-end mt-6">
                    <Button 
                      onClick={handleUpdateCounters}
                      disabled={updatingCounters}
                      size="lg"
                      className="px-8"
                    >
                      {updatingCounters ? (
                        <>
                          <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Updating...
                        </>
                      ) : (
                        "Save All Changes"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
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