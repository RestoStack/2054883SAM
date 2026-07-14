import { Link } from "@tanstack/react-router";
import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface Crumb { label: string; to?: string }

interface PageHeaderProps {
  title: string;
  description?: string;
  crumbs?: Crumb[];
  icon?: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, crumbs, icon: Icon, iconBg = "bg-primary/10", iconColor = "text-primary", actions }: PageHeaderProps) {
  return (
    <div className="border-b border-border bg-card/40 px-4 sm:px-5 pt-3 pb-3">
      {crumbs && (
        <nav className="mb-2 sm:mb-3 flex items-center gap-1 text-xs sm:text-sm text-muted-foreground overflow-x-auto">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1 whitespace-nowrap">
              {i > 0 && <ChevronRight className="size-3.5" />}
              {c.to ? (
                <Link to={c.to} className="hover:text-foreground">{c.label}</Link>
              ) : (
                <span className={i === crumbs.length - 1 ? "text-foreground font-medium" : ""}>{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
        <div className="flex items-start gap-3 sm:gap-4 min-w-0">
          {Icon && (
            <div className={`size-10 sm:size-12 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
              <Icon className={`size-5 sm:size-6 ${iconColor}`} />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">{title}</h1>
            {description && <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
}
