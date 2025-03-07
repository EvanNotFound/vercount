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
    } finally {
      setAddingDomain(false);
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
                          <div className="space-y-2">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                          <div className="space-y-2">
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
                  <div className="space-y-4">
                    {domains.map((domain) => (
                      <div
                        key={domain.id}
                        className="p-4 border rounded-lg hover:bg-accent/10 transition-colors cursor-pointer"
                        onClick={() => router.push(`/dashboard/counters?domain=${domain.name}`)}
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 