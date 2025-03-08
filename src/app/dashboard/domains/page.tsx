"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { HomeIcon, Globe, ArrowRight } from "lucide-react";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import { Separator } from "@/components/ui/separator";
import { safeDecodeURIComponent } from "@/utils/url";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

export default function DomainsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [domainsLoading, setDomainsLoading] = useState(true);
  const [addingDomain, setAddingDomain] = useState(false);
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
  const [domainToUnlink, setDomainToUnlink] = useState<string | null>(null);

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
      setDomainsLoading(true);
      const response = await fetch("/api/domains");
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch domains");
      }
      
      if (data.status === "success") {
        setDomains(data.data.domains);
      } else {
        throw new Error(data.message || "Failed to fetch domains");
      }
    } catch (error) {
      console.error("Error fetching domains:", error);
      toast.error("Failed to load domains");
    } finally {
      setDomainsLoading(false);
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
      setAddingDomain(true);
      const response = await fetch("/api/domains", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domain: newDomain }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to add domain");
      }
      
      if (data.status === "success") {
        toast.success(data.message || "Domain added successfully");
        setNewDomain("");
        fetchDomains();
      } else {
        throw new Error(data.message || "Failed to add domain");
      }
    } catch (error) {
      console.error("Error adding domain:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add domain");
    } finally {
      setAddingDomain(false);
    }
  };

  const handleVerifyDomain = async (e: React.MouseEvent, domainId: string) => {
    e.stopPropagation();
    const domain = domains.find((d) => d.id === domainId);
    if (!domain) {
      return;
    }

    // For unverified domains, try to verify via DNS
    const verifyPromise = () => 
      fetch("/api/domains/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domainId: domain.id,
          verificationCode: domain.verificationCode,
        }),
      })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Verification failed");
        }
        if (data.status !== "success") {
          throw new Error(data.message || "Verification failed");
        }
        return data;
      });
    
    toast.promise(verifyPromise, {
      loading: "Checking DNS records...",
      success: (data) => {
        fetchDomains(); // Refresh the domains list
        return data.message || "Domain verified successfully!";
      },
      error: (err) => {
        console.error("Verification error:", err);
        return err.message || "Failed to verify domain";
      },
    });
  };

  // Unlink a domain
  const handleUnlinkDomain = async (e: React.MouseEvent, domainId: string) => {
    e.stopPropagation();
    
    // Open the dialog and set the domain to unlink
    setDomainToUnlink(domainId);
    setShowUnlinkDialog(true);
  };
  
  // Perform the actual unlinking after confirmation
  const confirmUnlinkDomain = async () => {
    if (!domainToUnlink) return;
    
    try {
      const response = await fetch(`/api/domains/unlink?id=${domainToUnlink}`, {
        method: "POST",
      });
      
      const data = await response.json();
      
      if (response.ok && data.status === "success") {
        toast.success(data.message || "Domain unlinked successfully");
        fetchDomains(); // Refresh the domains list
      } else {
        throw new Error(data.message || "Failed to unlink domain");
      }
    } catch (error) {
      console.error("Error unlinking domain:", error);
      toast.error(error instanceof Error ? error.message : "Failed to unlink domain");
    } finally {
      setShowUnlinkDialog(false);
      setDomainToUnlink(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Breadcrumb header */}
      <DashboardHeader items={[
        { label: "Home", href: "/", icon: HomeIcon },
        { label: "Dashboard", href: "/dashboard" },
        { label: "Domains" },
      ]} />

      {/* Main content */}
      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-6xl w-full mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl md:text-3xl font-bold">My Domains</h1>
            <Button onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add New Domain</CardTitle>
                <CardDescription>Enter a domain name to start tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddDomain} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label htmlFor="domain-name">Domain Name</Label>
                    <Input
                      id="domain-name"
                      placeholder="example.com"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      disabled={addingDomain}
                    />
                  </div>
                  <Button type="submit" disabled={addingDomain}>
                    {addingDomain ? "Adding..." : "Add Domain"}
                  </Button>
                </form>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>My Domains</CardTitle>
                <CardDescription>Manage your registered domains</CardDescription>
              </CardHeader>
              <CardContent>
                {domainsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-4 border rounded-lg">
                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
                          <div className="flex flex-col gap-2">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : domains.length === 0 ? (
                  <p className="text-muted-foreground">No domains added yet.</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {domains.map((domain) => (
                      <div
                        key={domain.id}
                        className="p-4 border rounded-lg bg-secondary/30"
                      >
                        {/* First row: Domain name on left, action buttons on right */}
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <h3 className="font-medium">{domain.name}</h3>
                          </div>
                          
                          <div className="flex gap-2">
                            {!domain.verified && (
                              <Button 
                                variant="outline" 
                                onClick={(e) => {
                                  handleVerifyDomain(e, domain.id);
                                }}
                              >
                                Refresh
                              </Button>
                            )}
                            <Button 
                              variant="secondary" 
                              onClick={(e) => {
                                e.stopPropagation();
                                // Edit functionality would go here
                              }}
                            >
                              Edit
                            </Button>
                            <Button 
                              variant="destructive" 
                              onClick={(e) => handleUnlinkDomain(e, domain.id)}
                            >
                              Unlink
                            </Button>
                          </div>
                        </div>
                        
                        {/* Second row: Verification section or stats */}
                        {!domain.verified ? (
                          <div className="w-full">
                            <div className="flex items-center gap-2 bg-red-500/10 text-red-500 p-2 rounded mb-4">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-triangle">
                                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                                <path d="M12 9v4"></path>
                                <path d="M12 17h.01"></path>
                              </svg>
                              <span className="text-sm">Domain is pending verification</span>
                            </div>
                            
                            <div className="border rounded p-4 mb-2">
                              <h4 className="text-sm font-medium mb-4">Domain verification (DNS)</h4>
                              <div className="border-t border-b py-4 mb-4">
                                <p className="text-xs mb-2">
                                  Set the following TXT record on <span className="font-mono bg-secondary/30 px-1 rounded">_vercount.{domain.name}</span> to use <span className="font-mono bg-secondary/30 px-1 rounded">{domain.name}</span> in this project.
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Once the verification is completed and the domain is successfully configured, the TXT record can be removed.
                                </p>
                              </div>
                              
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead className="text-left">
                                    <tr>
                                      <th className="pb-2">Type</th>
                                      <th className="pb-2">Name</th>
                                      <th className="pb-2">Value</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr>
                                      <td className="py-2">TXT</td>
                                      <td className="py-2 font-mono">_vercount.{domain.name}</td>
                                      <td className="py-2 font-mono">vercount-domain-verify={domain.name},{domain.verificationCode}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                          <Separator className="my-4" />
                          <div 
                            className="cursor-pointer hover:bg-secondary/50 transition-colors rounded-lg p-4" 
                            onClick={() => router.push(`/dashboard/counters?domain=${domain.name}`)}
                          >
                            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                              <div className="flex gap-6 items-center">
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-3xl font-bold">{domain.counters?.sitePv || 0}</span>
                                  <span className="text-xs text-muted-foreground">Page Views</span>
                                </div>
                                <Separator orientation="vertical" className="hidden sm:block h-10" />
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-3xl font-bold">{domain.counters?.siteUv || 0}</span>
                                  <span className="text-xs text-muted-foreground">Unique Visitors</span>
                                </div>
                              </div>
                              
                              <Button 
                                variant="default" 
                                className="w-full sm:w-auto"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/dashboard/counters?domain=${domain.name}`);
                                }}
                              >
                                View Analytics <ArrowRight className="w-4 h-4 ml-2" />
                              </Button>
                            </div>
                            
                            {domain.counters?.pageViews && domain.counters.pageViews.length > 0 && (
                              <div className="mt-4 pt-4 border-t">
                                <p className="text-xs text-muted-foreground mb-2">Top Pages</p>
                                <div className="space-y-2">
                                  {domain.counters.pageViews.slice(0, 3).map((page, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm">
                                      <span className="truncate max-w-[70%]">{safeDecodeURIComponent(page.path)}</span>
                                      <span className="font-medium">{page.views}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Domain unlink confirmation dialog */}
      <AlertDialog open={showUnlinkDialog} onOpenChange={setShowUnlinkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink Domain</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unlink this domain? This will remove it from your dashboard but preserve the analytics data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUnlinkDomain}>Unlink</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 