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
        <div className="max-w-5xl w-full mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Domains</h1>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
          
          <div className="space-y-8">
            {/* Add domain form */}
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Label htmlFor="domain-name" className="text-sm font-medium mb-2">Add a domain</Label>
                <Input
                  id="domain-name"
                  placeholder="example.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  disabled={addingDomain}
                  className="h-10"
                />
              </div>
              <Button 
                type="submit" 
                disabled={addingDomain} 
                onClick={handleAddDomain}
                className="h-10"
              >
                {addingDomain ? "Adding..." : "Add"}
              </Button>
            </div>
            
            {/* Domains list */}
            <div>
              <h2 className="text-lg font-medium mb-4">My domains</h2>
              
              {domainsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 border rounded-lg bg-secondary/5">
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
                <div className="border border-dashed rounded-lg p-8 text-center bg-secondary/[0.02]">
                  <Globe className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No domains added yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">Add your first domain to start tracking analytics.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {domains.map((domain) => (
                    <div
                      key={domain.id}
                      className="border rounded-lg overflow-hidden bg-secondary/5 hover:bg-secondary/10 transition-colors"
                    >
                      <div className="p-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${domain.verified ? 'bg-green-500' : 'bg-amber-500'}`} />
                          <h3 className="font-medium">{domain.name}</h3>
                          {!domain.verified && (
                            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                              Pending verification
                            </span>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          {!domain.verified && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => handleVerifyDomain(e, domain.id)}
                            >
                              Verify
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Edit functionality would go here
                            }}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={(e) => handleUnlinkDomain(e, domain.id)}
                          >
                            Unlink
                          </Button>
                        </div>
                      </div>
                      
                      {/* Verification instructions or analytics summary */}
                      {!domain.verified ? (
                        <div className="border-t p-4 bg-black">
                          <h4 className="text-sm font-medium mb-3">Verification required</h4>
                          <p className="text-xs text-muted-foreground mb-4">
                            Add this TXT record to your DNS configuration to verify ownership:
                          </p>
                          
                          <div className="bg-secondary/20 rounded-md p-3 mb-4 overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead className="text-left">
                                <tr>
                                  <th className="pb-2 text-muted-foreground">Type</th>
                                  <th className="pb-2 text-muted-foreground">Name</th>
                                  <th className="pb-2 text-muted-foreground">Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="py-1 font-mono">TXT</td>
                                  <td className="py-1 font-mono">_vercount.{domain.name}</td>
                                  <td className="py-1 font-mono">vercount-domain-verify={domain.name},{domain.verificationCode}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                          
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={(e) => handleVerifyDomain(e, domain.id)}
                          >
                            Check verification
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="border-t p-4 cursor-pointer hover:bg-primary/[0.03] transition-colors bg-black" 
                          onClick={() => router.push(`/dashboard/counters?domain=${domain.name}`)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex gap-6">
                              <div>
                                <p className="text-2xl font-semibold">{domain.counters?.sitePv || 0}</p>
                                <p className="text-xs text-muted-foreground">Page Views</p>
                              </div>
                              <div>
                                <p className="text-2xl font-semibold">{domain.counters?.siteUv || 0}</p>
                                <p className="text-xs text-muted-foreground">Unique Visitors</p>
                              </div>
                            </div>
                            
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="gap-1 text-primary/80 hover:text-primary hover:bg-primary/[0.05]"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/dashboard/counters?domain=${domain.name}`);
                              }}
                            >
                              View Analytics <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                          </div>
                          
                          {domain.counters?.pageViews && domain.counters.pageViews.length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                              <p className="text-xs text-muted-foreground mb-2">Top Pages</p>
                              <div className="space-y-2">
                                {domain.counters.pageViews.slice(0, 3).map((page, i) => (
                                  <div key={i} className="flex justify-between items-center text-sm">
                                    <span className="truncate max-w-[70%] text-xs">{safeDecodeURIComponent(page.path)}</span>
                                    <span className="text-xs font-medium">{page.views}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
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