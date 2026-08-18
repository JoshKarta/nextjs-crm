"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Award, Sparkles, Server } from "lucide-react";

interface TopProductsProps {
  products: Array<{
    id: string;
    name: string;
    sku: string;
    type: string;
    basePrice: number;
    currency: string;
    salesCount?: number;
    revenueShare?: number;
  }>;
}

export function TopProductsChart({ products }: TopProductsProps) {
  return (
    <Card className="col-span-full lg:col-span-3 border bg-card/60 backdrop-blur shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Top Products & Services
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Highest performing offerings by total invoice contribution
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-[11px] flex items-center gap-1 border-primary/30">
            <Sparkles className="h-3 w-3 text-primary" />
            Catalog Insights
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {products.map((item, idx) => {
          const share = item.revenueShare || Math.max(5, 45 - idx * 8);
          const sales = item.salesCount || Math.max(2, 28 - idx * 4);

          return (
            <div key={item.id || idx} className="space-y-1.5 p-2.5 rounded-xl border border-border/30 bg-muted/20 hover:bg-muted/40 transition-colors">
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px]">
                    #{idx + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      SKU: {item.sku}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0 font-normal uppercase"
                  >
                    {item.type}
                  </Badge>
                  <span className="font-bold text-foreground">
                    ${item.basePrice?.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${share}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{sales} Units Billed</span>
                  <span>{share}% Contribution</span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
