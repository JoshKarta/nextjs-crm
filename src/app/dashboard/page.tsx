"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import Navbar from "@/components/landing/navbar";
import { DashboardKPICards } from "@/components/dashboard/dashboard-kpi-cards";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { InvoiceStatusChart } from "@/components/dashboard/invoice-status-chart";
import { TopProductsChart } from "@/components/dashboard/top-products-chart";
import { RecentInvoicesCard } from "@/components/dashboard/recent-invoices-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  RefreshCw,
  FileText,
  Users,
  Package,
  Shield,
  Sparkles,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Calendar,
  LayoutDashboard,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DashboardPage() {
  const { useSession } = authClient;
  const { data: session } = useSession();
  const [period, setPeriod] = useState("6m");

  const { data, error, mutate, isValidating } = useSWR(
    `/api/dashboard/stats?period=${period}`,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 60000,
    }
  );

  const userName = session?.user?.name || "Executive";
  const userRole = session?.user?.role || "Admin";

  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-primary-foreground">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl space-y-8">
        {/* Executive Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/40 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
                Good day, {userName}
              </h1>
              <Badge variant="secondary" className="px-2 py-0.5 text-xs font-semibold">
                {userRole}
              </Badge>
              {data?.isDemoData && (
                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                  Demo Mode
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              {todayStr} · CRM & Invoicing Intelligence
            </p>
          </div>

          {/* Action Bar & Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Period Selector */}
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px] h-9 text-xs bg-card">
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="6m">Last 6 Months</SelectItem>
                <SelectItem value="ytd">Year to Date</SelectItem>
                <SelectItem value="1y">Full Year</SelectItem>
              </SelectContent>
            </Select>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 bg-card"
              onClick={() => mutate()}
              disabled={isValidating}
              title="Refresh Analytics"
            >
              <RefreshCw className={`h-4 w-4 ${isValidating ? "animate-spin text-primary" : ""}`} />
            </Button>

            {/* Primary Action Buttons */}
            <Button size="sm" className="h-9 gap-1.5 font-semibold text-xs shadow-md" asChild>
              <Link href="/dashboard/invoices">
                <Plus className="h-3.5 w-3.5" />
                New Invoice
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs bg-card" asChild>
              <Link href="/dashboard/contacts">
                <Users className="h-3.5 w-3.5" />
                Add Contact
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs bg-card" asChild>
              <Link href="/dashboard/products">
                <Package className="h-3.5 w-3.5" />
                Add Product
              </Link>
            </Button>
          </div>
        </div>

        {/* Urgent Alert Banner (If overdue invoices exist) */}
        {data?.summary?.overdueCount > 0 && (
          <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-rose-500/5 to-transparent p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">
                  {data.summary.overdueCount} Overdue Invoices Requiring Attention
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Total past due balance of{" "}
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    ${data.summary.overdueAmount?.toLocaleString()}
                  </span>{" "}
                  exceeds normal terms.
                </p>
              </div>
            </div>

            <Button size="sm" variant="outline" className="border-amber-500/40 text-xs gap-1 bg-amber-500/10 hover:bg-amber-500/20" asChild>
              <Link href="/dashboard/invoices">
                Review Overdue List
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        )}

        {/* Loading State Skeleton */}
        {!data && !error ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-28 rounded-2xl bg-muted/40 animate-pulse" />
              ))}
            </div>
            <div className="h-[380px] rounded-2xl bg-muted/40 animate-pulse" />
          </div>
        ) : (
          <>
            {/* Top KPI Cards Grid */}
            <DashboardKPICards summary={data.summary} />

            {/* Interactive Layout Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
              <div className="flex items-center justify-between">
                <TabsList className="bg-card border border-border/50 p-1 rounded-xl">
                  <TabsTrigger value="overview" className="text-xs gap-1.5 rounded-lg">
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    Executive Overview
                  </TabsTrigger>
                  <TabsTrigger value="catalog" className="text-xs gap-1.5 rounded-lg">
                    <Layers className="h-3.5 w-3.5" />
                    Products & Operations
                  </TabsTrigger>
                </TabsList>

                <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Live Sync Active
                </div>
              </div>

              {/* Tab 1: Overview */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-6">
                  <RevenueChart monthlyData={data.monthlyTrends} />
                  <InvoiceStatusChart statusBreakdown={data.statusBreakdown} />
                </div>
              </TabsContent>

              {/* Tab 2: Catalog & Operations */}
              <TabsContent value="catalog" className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-6">
                  <TopProductsChart products={data.topProducts} />
                  <ActivityFeed activities={data.recentActivity} />
                </div>
              </TabsContent>
            </Tabs>

            {/* Recent Invoices Table */}
            <RecentInvoicesCard invoices={data.recentInvoices} />
          </>
        )}

        {/* Workspace Quick Apps Grid */}
        <div className="pt-6 border-t border-border/40">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Module Access & Tools
            </h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/dashboard/invoices"
              className="p-4 rounded-xl border border-border/60 bg-card hover:bg-muted/40 transition-all duration-200 flex items-center gap-3 group"
            >
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">
                  Invoices Hub
                </h4>
                <p className="text-xs text-muted-foreground">
                  Drafting, layout templates & PDF billing
                </p>
              </div>
            </Link>

            <Link
              href="/dashboard/contacts"
              className="p-4 rounded-xl border border-border/60 bg-card hover:bg-muted/40 transition-all duration-200 flex items-center gap-3 group"
            >
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">
                  Client Contacts
                </h4>
                <p className="text-xs text-muted-foreground">
                  Companies, individuals & billing addresses
                </p>
              </div>
            </Link>

            <Link
              href="/dashboard/products"
              className="p-4 rounded-xl border border-border/60 bg-card hover:bg-muted/40 transition-all duration-200 flex items-center gap-3 group"
            >
              <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 group-hover:scale-110 transition-transform">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">
                  Catalog Manager
                </h4>
                <p className="text-xs text-muted-foreground">
                  Services, products, pricing & SKUs
                </p>
              </div>
            </Link>

            <Link
              href="/admin"
              className="p-4 rounded-xl border border-border/60 bg-card hover:bg-muted/40 transition-all duration-200 flex items-center gap-3 group"
            >
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">
                  Admin Control
                </h4>
                <p className="text-xs text-muted-foreground">
                  User permissions, roles & system security
                </p>
              </div>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        <p>
          Executive CRM & Invoicing Platform · Built with Next.js 15, Better Auth, PostgreSQL & Drizzle ORM
        </p>
      </footer>
    </div>
  );
}
