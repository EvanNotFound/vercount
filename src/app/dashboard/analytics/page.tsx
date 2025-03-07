"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HomeIcon, ArrowLeft, BarChart3, TrendingUp, Users, Clock } from "lucide-react";
import DashboardHeader from "@/components/dashboard/dashboard-header";

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Dummy data for analytics
  const [analyticsData, setAnalyticsData] = useState({
    dailyVisits: [
      { date: "Mon", value: 1240 },
      { date: "Tue", value: 1580 },
      { date: "Wed", value: 1890 },
      { date: "Thu", value: 2390 },
      { date: "Fri", value: 2190 },
      { date: "Sat", value: 1950 },
      { date: "Sun", value: 2100 },
    ],
    topReferrers: [
      { source: "Google", visits: 4230, percentage: 45 },
      { source: "Direct", visits: 2150, percentage: 23 },
      { source: "Twitter", visits: 1250, percentage: 13 },
      { source: "Facebook", visits: 980, percentage: 10 },
      { source: "LinkedIn", visits: 540, percentage: 6 },
      { source: "Others", visits: 280, percentage: 3 },
    ],
    deviceStats: {
      desktop: 58,
      mobile: 36,
      tablet: 6
    },
    bounceRate: 32,
    avgSessionDuration: "2m 45s",
    pagesPerSession: 3.2
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Simulate loading
  useEffect(() => {
    if (status === "authenticated") {
      const timer = setTimeout(() => {
        setAnalyticsLoading(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [status]);

  return (
    <div className="flex-1 flex flex-col">
      {/* Breadcrumb header */}
      <DashboardHeader items={[
        { label: "Home", href: "/", icon: HomeIcon },
        { label: "Dashboard", href: "/dashboard" },
        { label: "Analytics" },
      ]} />

      {/* Main content */}
      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-6xl w-full mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl md:text-3xl font-bold">Analytics</h1>
            <Button onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          
          {/* Key metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Bounce Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">
                    {analyticsLoading ? <Skeleton className="h-7 w-16" /> : `${analyticsData.bounceRate}%`}
                  </div>
                  <div className="p-2 bg-primary/10 rounded-full">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {analyticsLoading ? (
                    <Skeleton className="h-4 w-32" />
                  ) : (
                    <><span className="text-green-500">-2.5%</span> from last week</>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Session Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">
                    {analyticsLoading ? <Skeleton className="h-7 w-16" /> : analyticsData.avgSessionDuration}
                  </div>
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {analyticsLoading ? (
                    <Skeleton className="h-4 w-32" />
                  ) : (
                    <><span className="text-green-500">+15s</span> from last week</>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pages Per Session</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">
                    {analyticsLoading ? <Skeleton className="h-7 w-16" /> : analyticsData.pagesPerSession}
                  </div>
                  <div className="p-2 bg-primary/10 rounded-full">
                    <BarChart3 className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {analyticsLoading ? (
                    <Skeleton className="h-4 w-32" />
                  ) : (
                    <><span className="text-green-500">+0.3</span> from last week</>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Daily visits chart (simplified) */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Daily Visits</CardTitle>
              <CardDescription>Visitor traffic over the past week</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="h-[300px] flex items-end justify-between gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((_, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <Skeleton className="w-12 rounded-t-md" style={{ height: `${Math.random() * 150 + 100}px` }} />
                      <Skeleton className="h-4 w-8 mt-2" />
                      <Skeleton className="h-4 w-12 mt-1" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[300px] flex items-end justify-between gap-2">
                  {analyticsData.dailyVisits.map((day, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div 
                        className="bg-primary/80 w-12 rounded-t-md" 
                        style={{ 
                          height: `${(day.value / 2500) * 250}px`,
                        }}
                      ></div>
                      <div className="text-xs mt-2">{day.date}</div>
                      <div className="text-xs text-muted-foreground">{day.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Traffic sources and device breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Traffic Sources</CardTitle>
                <CardDescription>Where your visitors are coming from</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsLoading ? (
                    Array(6).fill(0).map((_, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-5 w-24" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                        <Skeleton className="w-full h-2 rounded-full" />
                      </div>
                    ))
                  ) : (
                    analyticsData.topReferrers.map((source, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{source.source}</span>
                          <span className="text-sm">{source.visits} visits ({source.percentage}%)</span>
                        </div>
                        <div className="w-full bg-secondary/30 rounded-full h-2">
                          <div 
                            className="bg-primary rounded-full h-2" 
                            style={{ width: `${source.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Device Breakdown</CardTitle>
                <CardDescription>What devices your visitors are using</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="flex items-center justify-center h-[250px]">
                    <Skeleton className="w-[200px] h-[200px] rounded-full" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[250px]">
                    <div className="flex flex-col items-center">
                      <div className="relative w-[200px] h-[200px] rounded-full border-8 border-primary flex items-center justify-center">
                        <div 
                          className="absolute top-0 left-0 w-full h-full rounded-full border-8 border-secondary"
                          style={{ 
                            clipPath: `polygon(50% 50%, 100% 0, 100% ${analyticsData.deviceStats.desktop * 3.6}deg)` 
                          }}
                        ></div>
                        <div 
                          className="absolute top-0 left-0 w-full h-full rounded-full border-8 border-accent"
                          style={{ 
                            clipPath: `polygon(50% 50%, ${analyticsData.deviceStats.desktop * 3.6}deg 0, ${(analyticsData.deviceStats.desktop + analyticsData.deviceStats.mobile) * 3.6}deg 0)` 
                          }}
                        ></div>
                        <div className="text-lg font-bold">100%</div>
                      </div>
                      <div className="flex gap-6 mt-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-primary rounded-full"></div>
                          <span className="text-sm">Desktop ({analyticsData.deviceStats.desktop}%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-secondary rounded-full"></div>
                          <span className="text-sm">Mobile ({analyticsData.deviceStats.mobile}%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-accent rounded-full"></div>
                          <span className="text-sm">Tablet ({analyticsData.deviceStats.tablet}%)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Note about dummy data */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground italic">
                Note: This is a demo page with dummy data. In a real implementation, this would be connected to your actual analytics data.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 