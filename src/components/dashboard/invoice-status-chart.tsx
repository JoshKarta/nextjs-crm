"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PieChart as PieIcon, CheckCircle2, Clock, FileEdit, AlertTriangle, XCircle } from "lucide-react";

interface StatusChartProps {
  statusBreakdown: {
    counts: {
      PAID: number;
      FINALIZED: number;
      DRAFT: number;
      OVERDUE: number;
      VOID: number;
    };
    amounts: {
      PAID: number;
      FINALIZED: number;
      DRAFT: number;
      OVERDUE: number;
      VOID: number;
    };
  };
}

export function InvoiceStatusChart({ statusBreakdown }: StatusChartProps) {
  const { counts, amounts } = statusBreakdown;

  const data = [
    { name: "Paid", key: "PAID", value: counts.PAID || 0, amount: amounts.PAID || 0, color: "#10b981", icon: CheckCircle2 },
    { name: "Finalized", key: "FINALIZED", value: counts.FINALIZED || 0, amount: amounts.FINALIZED || 0, color: "#3b82f6", icon: Clock },
    { name: "Draft", key: "DRAFT", value: counts.DRAFT || 0, amount: amounts.DRAFT || 0, color: "#8b5cf6", icon: FileEdit },
    { name: "Overdue", key: "OVERDUE", value: counts.OVERDUE || 0, amount: amounts.OVERDUE || 0, color: "#f59e0b", icon: AlertTriangle },
    { name: "Void", key: "VOID", value: counts.VOID || 0, amount: amounts.VOID || 0, color: "#64748b", icon: XCircle },
  ].filter((item) => item.value > 0);

  const totalInvoices = data.reduce((acc, curr) => acc + curr.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const pct = totalInvoices > 0 ? ((item.value / totalInvoices) * 100).toFixed(1) : "0";
      return (
        <div className="rounded-xl border border-border/60 bg-card/95 p-3 shadow-xl backdrop-blur-md text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            {item.name} Invoices
          </div>
          <p className="text-muted-foreground">
            Count: <span className="font-semibold text-foreground">{item.value} ({pct}%)</span>
          </p>
          <p className="text-muted-foreground">
            Total Value: <span className="font-semibold text-foreground">${item.amount?.toLocaleString()}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="col-span-full lg:col-span-2 border bg-card/60 backdrop-blur shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <PieIcon className="h-5 w-5 text-primary" />
          Invoice Status Distribution
        </CardTitle>
        <CardDescription className="text-xs">
          Lifecycle breakdown across all processed invoices
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col items-center">
        <div className="relative h-[220px] w-full max-w-[260px] flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={62}
                outerRadius={88}
                paddingAngle={4}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-3xl font-extrabold text-foreground tracking-tight">
              {totalInvoices}
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Total Invoices
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="w-full space-y-2 mt-2 pt-2 border-t border-border/40">
          {data.map((item) => {
            const IconComp = item.icon;
            const pct = totalInvoices > 0 ? ((item.value / totalInvoices) * 100).toFixed(0) : "0";
            return (
              <div
                key={item.key}
                className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <IconComp className="h-3.5 w-3.5" style={{ color: item.color }} />
                  <span className="font-medium text-foreground">{item.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{pct}% ({item.value})</span>
                  <span className="font-semibold text-foreground min-w-[60px] text-right">
                    ${item.amount.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
