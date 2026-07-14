import { AppShell } from "@/components/layout/Sidebar";
import type { ReactNode } from "react";

/** Alias for AppShell — used by routes that import `@/components/AppLayout`. */
export function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

export default AppLayout;
