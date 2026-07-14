import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  delta?: { value: string; positive?: boolean };
  caption?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  children?: ReactNode;
}

export function StatCard({ label, value, delta, caption, icon: Icon, iconColor = "text-primary", iconBg = "bg-primary/10", children }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className={`size-10 rounded-full ${iconBg} flex items-center justify-center shrink-0`}>
            <Icon className={`size-5 ${iconColor}`} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground tracking-tight">{value}</span>
            {delta && (
              <span className={`text-xs font-semibold inline-flex items-center gap-0.5 ${delta.positive ? "text-success" : "text-destructive"}`}>
                {delta.positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {delta.value}
              </span>
            )}
          </div>
          {caption && <div className="mt-1 text-xs text-muted-foreground">{caption}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}
