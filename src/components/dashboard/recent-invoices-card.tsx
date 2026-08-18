"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ArrowRight, CheckCircle2, Clock, FileEdit, AlertTriangle } from "lucide-react";

interface RecentInvoicesProps {
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    contactName: string;
    status: string;
    totalAmount: number;
    amountDue: number;
    currency: string;
    invoiceDate: string;
    dueDate: string | null;
  }>;
}

export function RecentInvoicesCard({ invoices }: RecentInvoicesProps) {
  const getStatusBadge = (status: string, dueDate: string | null, amountDue: number) => {
    const isOverdue =
      status === "FINALIZED" &&
      dueDate &&
      new Date(dueDate) < new Date() &&
      amountDue > 0;

    if (isOverdue) {
      return (
        <Badge
          variant="outline"
          className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 flex items-center gap-1 text-[11px]"
        >
          <AlertTriangle className="h-3 w-3" />
          Overdue
        </Badge>
      );
    }

    switch (status) {
      case "PAID":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1 text-[11px]"
          >
            <CheckCircle2 className="h-3 w-3" />
            Paid
          </Badge>
        );
      case "FINALIZED":
        return (
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 flex items-center gap-1 text-[11px]"
          >
            <Clock className="h-3 w-3" />
            Finalized
          </Badge>
        );
      case "DRAFT":
        return (
          <Badge
            variant="outline"
            className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 flex items-center gap-1 text-[11px]"
          >
            <FileEdit className="h-3 w-3" />
            Draft
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-[11px]">
            {status}
          </Badge>
        );
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card className="col-span-full lg:col-span-4 border bg-card/60 backdrop-blur shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Recent Invoices
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Latest client billings and status updates
          </CardDescription>
        </div>

        <Button variant="ghost" size="sm" className="text-xs gap-1 hover:text-primary" asChild>
          <Link href="/dashboard/invoices">
            View All
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground text-left font-medium uppercase tracking-wider">
                <th className="pb-3 pl-2">Invoice #</th>
                <th className="pb-3">Client / Contact</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Due Date</th>
                <th className="pb-3 pr-2 text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="group hover:bg-muted/30 transition-colors"
                >
                  <td className="py-3 pl-2 font-mono font-semibold text-primary">
                    <Link href="/dashboard/invoices" className="hover:underline">
                      {inv.invoiceNumber}
                    </Link>
                  </td>
                  <td className="py-3 font-medium text-foreground">
                    {inv.contactName}
                  </td>
                  <td className="py-3">
                    {getStatusBadge(inv.status, inv.dueDate, inv.amountDue)}
                  </td>
                  <td className="py-3 text-muted-foreground">
                    {formatDate(inv.dueDate || inv.invoiceDate)}
                  </td>
                  <td className="py-3 pr-2 text-right font-bold text-foreground">
                    ${inv.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
