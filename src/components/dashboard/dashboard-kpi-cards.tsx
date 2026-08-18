"use client";

import { motion, type Variants } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  TrendingUp,
  Wallet,
  AlertTriangle,
  Users,
  Package,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

interface KPIMetricsProps {
  summary: {
    totalRevenue: number;
    cashCollected: number;
    amountDue: number;
    overdueCount: number;
    overdueAmount: number;
    totalInvoices: number;
    totalContacts: number;
    totalProducts: number;
    individualContacts?: number;
    companyContacts?: number;
    productItemsCount?: number;
    serviceItemsCount?: number;
  };
}

export function DashboardKPICards({ summary }: KPIMetricsProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const cards = [
    {
      title: "Total Billed Revenue",
      value: formatCurrency(summary.totalRevenue),
      change: "+14.2%",
      isPositive: true,
      subtext: `Across ${summary.totalInvoices} total invoices`,
      icon: DollarSign,
      gradient: "from-blue-500/10 via-indigo-500/5 to-transparent",
      iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      accentBorder: "border-l-4 border-l-blue-500",
    },
    {
      title: "Cash Realized",
      value: formatCurrency(summary.cashCollected),
      change: "+18.6%",
      isPositive: true,
      subtext: `${Math.round((summary.cashCollected / (summary.totalRevenue || 1)) * 100)}% collection rate`,
      icon: Wallet,
      gradient: "from-emerald-500/10 via-teal-500/5 to-transparent",
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      accentBorder: "border-l-4 border-l-emerald-500",
    },
    {
      title: "Outstanding & Overdue",
      value: formatCurrency(summary.amountDue),
      change: summary.overdueCount > 0 ? `${summary.overdueCount} overdue` : "On track",
      isPositive: summary.overdueCount === 0,
      subtext: summary.overdueCount > 0 
        ? `${formatCurrency(summary.overdueAmount)} past due date` 
        : "No critical past due invoices",
      icon: summary.overdueCount > 0 ? AlertTriangle : TrendingUp,
      gradient: summary.overdueCount > 0
        ? "from-amber-500/10 via-rose-500/5 to-transparent"
        : "from-purple-500/10 via-indigo-500/5 to-transparent",
      iconBg: summary.overdueCount > 0
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
        : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
      accentBorder: summary.overdueCount > 0 ? "border-l-4 border-l-amber-500" : "border-l-4 border-l-purple-500",
    },
    {
      title: "Active Contacts",
      value: summary.totalContacts.toString(),
      change: "+8.4%",
      isPositive: true,
      subtext: `${summary.companyContacts || 0} Companies · ${summary.individualContacts || 0} People`,
      icon: Users,
      gradient: "from-cyan-500/10 via-sky-500/5 to-transparent",
      iconBg: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
      accentBorder: "border-l-4 border-l-cyan-500",
    },
    {
      title: "Catalog Offerings",
      value: summary.totalProducts.toString(),
      change: "Active",
      isPositive: true,
      subtext: `${summary.serviceItemsCount || 0} Services · ${summary.productItemsCount || 0} Goods`,
      icon: Package,
      gradient: "from-pink-500/10 via-rose-500/5 to-transparent",
      iconBg: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
      accentBorder: "border-l-4 border-l-pink-500",
    },
  ];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
    >
      {cards.map((card, i) => {
        const IconComponent = card.icon;
        return (
          <motion.div key={i} variants={cardVariants} whileHover={{ y: -3, transition: { duration: 0.2 } }}>
            <Card
              className={`relative overflow-hidden transition-shadow duration-300 hover:shadow-lg border bg-card/60 backdrop-blur h-full ${card.accentBorder}`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} pointer-events-none`} />
              <CardContent className="p-5 relative z-10 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {card.title}
                  </span>
                  <div className={`p-2 rounded-xl border ${card.iconBg}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-2xl font-bold tracking-tight text-foreground">
                      {card.value}
                    </h3>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0.5 font-semibold flex items-center gap-0.5 border ${
                        card.isPositive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                      }`}
                    >
                      {card.isPositive ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {card.change}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                    {card.subtext}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
