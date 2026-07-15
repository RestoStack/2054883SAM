import { createContext, useContext, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";

type ServerAuthCtx = {
  /** True while the tablet server pad should hide the admin shell. */
  isServerMode: boolean;
};

const Ctx = createContext<ServerAuthCtx>({ isServerMode: false });

export function ServerAuthProvider({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isServerMode = pathname === "/server-app" || pathname.startsWith("/server-app/");

  return <Ctx.Provider value={{ isServerMode }}>{children}</Ctx.Provider>;
}

export function useServerAuth() {
  return useContext(Ctx);
}
