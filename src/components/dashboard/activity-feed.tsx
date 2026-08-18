"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, PlusCircle, RefreshCw, AlertCircle } from "lucide-react";

interface ActivityFeedProps {
  activities: Array<{
    id: string;
    action: string;
    entityType: string;
    timestamp: string;
    details: string;
  }>;
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const getActionIcon = (action: string) => {
    switch (action) {
      case "FINALIZE":
      case "PAID":
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
      case "CREATE":
        return <PlusCircle className="h-3.5 w-3.5 text-blue-500" />;
      case "UPDATE":
      case "PRICE_CHANGE":
        return <RefreshCw className="h-3.5 w-3.5 text-purple-500" />;
      default:
        return <AlertCircle className="h-3.5 w-3.5 text-amber-500" />;
    }
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const diffHours = Math.round((Date.now() - d.getTime()) / (1000 * 3600));
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <Card className="col-span-full lg:col-span-3 border bg-card/60 backdrop-blur shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Live Audit & Operations Stream
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Real-time audit log of system transactions and status updates
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
            Realtime
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="relative pl-4 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-border/60">
          {activities.map((item) => (
            <div key={item.id} className="relative flex items-start gap-3 text-xs">
              <div className="absolute -left-[21px] top-0.5 h-5 w-5 rounded-full bg-card border border-border/80 flex items-center justify-center shadow-sm">
                {getActionIcon(item.action)}
              </div>

              <div className="flex-1 space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-foreground">
                    {item.action} {item.entityType}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatTime(item.timestamp)}
                  </span>
                </div>
                <p className="text-muted-foreground line-clamp-2 text-[11px]">
                  {item.details}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
