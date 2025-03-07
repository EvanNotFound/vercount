"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

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
  const [newDomain, setNewDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [sitePv, setSitePv] = useState<number>(0);
  const [siteUv, setSiteUv] = useState<number>(0);
  const [pageViewUpdates, setPageViewUpdates] = useState<Record<string, number>>({});

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

  // Fetch domains from API
  const fetchDomains = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  // Add a new domain
  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newDomain) {
      toast.error("Please enter a domain name");
      return;
    }
    
    try {
      const response = await fetch("/api/domains", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domain: newDomain }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success("Domain added successfully");
        setNewDomain("");
        fetchDomains();
      } else {
        toast.error(data.message || "Failed to add domain");
      }
    } catch (error) {
      console.error("Error adding domain:", error);
      toast.error("Failed to add domain");
    }
  };

  // Select a domain to edit
  const handleSelectDomain = (domain: Domain) => {
    setSelectedDomain(domain);
    if (domain.counters) {
      setSitePv(domain.counters.sitePv);
      setSiteUv(domain.counters.siteUv);
      
      // Initialize page view updates
      const updates: Record<string, number> = {};
      domain.counters.pageViews.forEach((pageView) => {
        updates[pageView.path] = pageView.views;
      });
      setPageViewUpdates(updates);
    }
  };

  // Update counters
  const handleUpdateCounters = async () => {
    if (!selectedDomain) return;
    
    try {
      const response = await fetch("/api/domains/counters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domainName: selectedDomain.name,
          sitePv,
          siteUv,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success("Counters updated successfully");
        fetchDomains();
      } else {
        toast.error(data.message || "Failed to update counters");
      }
    } catch (error) {
      console.error("Error updating counters:", error);
      toast.error("Failed to update counters");
    }
  };

  // Update page view counter
  const handleUpdatePageView = async (path: string) => {
    if (!selectedDomain) return;
    
    try {
      const response = await fetch("/api/domains/pages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domainName: selectedDomain.name,
          path,
          pageViews: pageViewUpdates[path],
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success("Page view counter updated successfully");
        fetchDomains();
      } else {
        toast.error(data.message || "Failed to update page view counter");
      }
    } catch (error) {
      console.error("Error updating page view counter:", error);
      toast.error("Failed to update page view counter");
    }
  };

  // Handle page view input change
  const handlePageViewChange = (path: string, value: number) => {
    setPageViewUpdates((prev) => ({
      ...prev,
      [path]: value,
    }));
  };

  if (status === "loading" || loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col p-4 md:p-8">
      <div className="max-w-6xl mx-auto w-full">
        <h1 className="text-2xl md:text-3xl font-bold mb-6">Dashboard</h1>
        
        <Tabs defaultValue="domains" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="domains">My Domains</TabsTrigger>
            <TabsTrigger value="counters">Manage Counters</TabsTrigger>
          </TabsList>
          
          <TabsContent value="domains" className="space-y-6">
            <div className="bg-card rounded-lg border p-4 md:p-6">
              <h2 className="text-xl font-semibold mb-4">Add New Domain</h2>
              <form onSubmit={handleAddDomain} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label htmlFor="domain-name">Domain Name</Label>
                  <Input
                    id="domain-name"
                    placeholder="example.com"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                  />
                </div>
                <Button type="submit">Add Domain</Button>
              </form>
            </div>
            
            <div className="bg-card rounded-lg border p-4 md:p-6">
              <h2 className="text-xl font-semibold mb-4">My Domains</h2>
              
              {domains.length === 0 ? (
                <p className="text-muted-foreground">No domains added yet.</p>
              ) : (
                <div className="space-y-4">
                  {domains.map((domain) => (
                    <div
                      key={domain.id}
                      className="p-4 border rounded-lg hover:bg-accent/10 transition-colors"
                      onClick={() => handleSelectDomain(domain)}
                    >
                      <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
                        <div>
                          <h3 className="font-medium">{domain.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {domain.verified ? (
                              <span className="text-green-500">Verified</span>
                            ) : (
                              <span className="text-yellow-500">Pending verification</span>
                            )}
                          </p>
                        </div>
                        
                        {!domain.verified && (
                          <div className="bg-secondary/30 rounded p-2 text-xs break-all">
                            <p>Verification Code:</p>
                            <code>{domain.verificationCode}</code>
                          </div>
                        )}
                        
                        <div className="text-sm">
                          <p>
                            Site PV: <span className="font-semibold">{domain.counters?.sitePv || 0}</span>
                          </p>
                          <p>
                            Site UV: <span className="font-semibold">{domain.counters?.siteUv || 0}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="counters" className="space-y-6">
            {!selectedDomain ? (
              <div className="bg-card rounded-lg border p-6 text-center">
                <p className="text-muted-foreground">Please select a domain from the "My Domains" tab to manage counters.</p>
              </div>
            ) : (
              <>
                <div className="bg-card rounded-lg border p-4 md:p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    Manage Counters for {selectedDomain.name}
                  </h2>
                  
                  {!selectedDomain.verified && (
                    <div className="bg-yellow-100 border-yellow-300 border rounded-lg p-3 mb-4 dark:bg-yellow-900/20 dark:border-yellow-800">
                      <p className="text-yellow-700 dark:text-yellow-500">
                        This domain is not yet verified. Please verify ownership by adding the following verification code to your site:
                      </p>
                      <code className="block mt-2 p-2 bg-black/5 rounded dark:bg-white/5 break-all">
                        {selectedDomain.verificationCode}
                      </code>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <Label htmlFor="site-pv">Site Page Views</Label>
                      <div className="flex gap-2">
                        <Input
                          id="site-pv"
                          type="number"
                          value={sitePv}
                          onChange={(e) => setSitePv(parseInt(e.target.value) || 0)}
                          disabled={!selectedDomain.verified}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="site-uv">Site Unique Visitors</Label>
                      <div className="flex gap-2">
                        <Input
                          id="site-uv"
                          type="number"
                          value={siteUv}
                          onChange={(e) => setSiteUv(parseInt(e.target.value) || 0)}
                          disabled={!selectedDomain.verified}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleUpdateCounters} 
                    disabled={!selectedDomain.verified}
                  >
                    Update Counters
                  </Button>
                </div>
                
                <div className="bg-card rounded-lg border p-4 md:p-6">
                  <h2 className="text-xl font-semibold mb-4">Page Views</h2>
                  
                  {selectedDomain.counters?.pageViews.length === 0 ? (
                    <p className="text-muted-foreground">No page views data available.</p>
                  ) : (
                    <div className="space-y-4">
                      {selectedDomain.counters?.pageViews.map((pageView) => (
                        <div key={pageView.path} className="p-3 border rounded-lg">
                          <p className="font-medium text-sm mb-2 break-all">{pageView.path}</p>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              value={pageViewUpdates[pageView.path] || 0}
                              onChange={(e) => 
                                handlePageViewChange(
                                  pageView.path, 
                                  parseInt(e.target.value) || 0
                                )
                              }
                              disabled={!selectedDomain.verified}
                              className="max-w-[150px]"
                            />
                            <Button 
                              onClick={() => handleUpdatePageView(pageView.path)}
                              disabled={!selectedDomain.verified}
                              size="sm"
                            >
                              Update
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
} 