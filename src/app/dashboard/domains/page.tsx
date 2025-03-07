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
import { HomeIcon, Globe } from "lucide-react";
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

export default function DomainsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [domainsLoading, setDomainsLoading] = useState(true);
  const [addingDomain, setAddingDomain] = useState(false);

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

    if (!domain.verified) {
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
    } else {
      // For verified domains, just refresh the data
      fetchDomains();
      toast.success("Domain data refreshed");
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
                            <Button 
                              variant="outline" 
                              onClick={(e) => {
                                handleVerifyDomain(e, domain.id);
                              }}
                            >
                              Refresh
                            </Button>
                            <Button 
                              variant="secondary" 
                          
                              onClick={(e) => {
                                e.stopPropagation();
                                // Edit functionality would go here
                              }}
                            >
                              Edit
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
                              <h4 className="text-sm font-medium mb-4">Domain verification</h4>
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
                                      <td className="py-2 font-mono">_vercount</td>
                                      <td className="py-2 font-mono">vercount-domain-verify={domain.name},{domain.verificationCode}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div 
                            className="cursor-pointer" 
                            onClick={() => router.push(`/dashboard/counters?domain=${domain.name}`)}
                          >
                            <div className="flex justify-between items-center p-2 bg-accent/10 rounded">
                              <div className="text-sm">
                                <p>
                                  Site PV: <span className="font-semibold">{domain.counters?.sitePv || 0}</span>
                                </p>
                                <p>
                                  Site UV: <span className="font-semibold">{domain.counters?.siteUv || 0}</span>
                                </p>
                              </div>
                              <div>
                                <Button variant="ghost" size="sm">
                                  View Analytics →
                                </Button>
                              </div>
                            </div>
                          </div>
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
    </div>
  );
} 