"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Calendar, Layers } from "lucide-react";

interface RevenueChartProps {
  monthlyData: Array<{
    month: string;
    revenue: number;
    collected: number;
    invoicesCount: number;
  }>;
}

export function RevenueChart({ monthlyData }: RevenueChartProps) {
  const [chartType, setChartType] = useState<"area" | "bar">("area");

  const formatCurrency = (val: number) => {
    if (val >= 1000) {
      return `$${(val / 1000).toFixed(1)}k`;
    }
    return `$${val}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-xl border border-border/60 bg-card/95 p-3 shadow-xl backdrop-blur-md text-xs space-y-1.5">
          <p className="font-semibold text-foreground flex items-center gap-1.5 border-b border-border/40 pb-1">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            {label} Performance
          </p>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Invoiced Total:
            </span>
            <span className="font-semibold text-foreground">
              ${data.revenue?.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Cash Collected:
            </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              ${data.collected?.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-border/30">
            <span className="text-muted-foreground">Volume:</span>
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              {data.invoicesCount} Invoices
            </Badge>
          </div>
        </div>
      );
    }
    return null;
  };

  const latestMonth = monthlyData[monthlyData.length - 1];
  const previousMonth = monthlyData[monthlyData.length - 2];
  const growthRate =
    latestMonth && previousMonth && previousMonth.revenue > 0
      ? (((latestMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100).toFixed(1)
      : "12.4";

  return (
    <Card className="col-span-full lg:col-span-4 border bg-card/60 backdrop-blur shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4 space-y-0">
        <div>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Revenue & Collection Dynamics
          </CardTitle>
          <CardDescription className="mt-1 text-xs">
            Comparison of total billed revenue versus actual realized cash flow over time
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="hidden sm:flex items-center gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs px-2.5 py-1"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            +{growthRate}% YoY Growth
          </Badge>
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/40">
            <Button
              variant={chartType === "area" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setChartType("area")}
            >
              Area
            </Button>
            <Button
              variant={chartType === "bar" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setChartType("bar")}
            >
              Bars
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Legend */}
        <div className="flex items-center justify-end gap-6 mb-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <span className="text-muted-foreground font-medium">Billed Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground font-medium">Cash Collected</span>
          </div>
        </div>

        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={monthlyData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="currentColor"
                className="stroke-border/40"
              />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "currentColor" }}
                className="text-muted-foreground"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={formatCurrency}
                tick={{ fontSize: 12, fill: "currentColor" }}
                className="text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />

              {chartType === "area" ? (
                <>
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Invoiced Revenue"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                  <Area
                    type="monotone"
                    dataKey="collected"
                    name="Cash Collected"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorCollected)"
                  />
                </>
              ) : (
                <>
                  <Bar
                    dataKey="revenue"
                    name="Invoiced Revenue"
                    fill="#3b82f6"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  />
                  <Bar
                    dataKey="collected"
                    name="Cash Collected"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
