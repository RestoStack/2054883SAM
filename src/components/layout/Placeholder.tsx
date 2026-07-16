import type { LucideIcon } from "lucide-react";
import { AppShell } from "@/components/layout/Sidebar";

export function Placeholder({ title, icon: Icon, desc }: { title: string; icon: LucideIcon; desc: string }) {
  return (
    <AppShell>
      <div className="px-5 pt-3 pb-3 border-b border-border bg-card/40">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{desc}</p>
      </div>
      <div className="p-5">
        <div className="max-w-md mx-auto text-center py-20">
          <div className="size-16 rounded-2xl bg-accent mx-auto flex items-center justify-center mb-4"><Icon className="size-8 text-primary" /></div>
          <h2 className="text-xl font-semibold mb-2">Coming soon</h2>
          <p className="text-sm text-muted-foreground">This module is part of the platform and will be available shortly.</p>
        </div>
      </div>
    </AppShell>
  );
}
