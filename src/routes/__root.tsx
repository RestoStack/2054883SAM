import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";

import appCss from "../styles.css?url";
import { RoleProvider } from "@/lib/role";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const PUBLIC_PATHS = [
  "/",
  "/book",
  "/login",
  "/admin-login",
  "/super-admin-login",
  "/pitchdeck",
  "/signup",
  "/start",
  "/auth/callback",
];

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/marketing") ||
    pathname.startsWith("/book/") ||
    pathname.startsWith("/auth/")
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, session, staff, platformAdmin, needsOnboarding } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (isPublicPath(pathname)) return;
    // /onboarding only requires a session (staff row may be created mid-flow).
    if (pathname === "/onboarding") {
      if (!session) navigate({ to: "/start", replace: true });
      return;
    }
    // Server pad uses its own PIN session, not Supabase staff auth.
    if (pathname === "/server-login" || pathname === "/server-app") return;
    // Platform super-admin console — separate from restaurant login.
    if (pathname.startsWith("/platform")) {
      if (!session || !platformAdmin) {
        navigate({ to: "/super-admin-login", replace: true });
      }
      return;
    }
    if (!session) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (platformAdmin && !staff) {
      navigate({ to: "/platform", replace: true });
      return;
    }
    // New owners: finish Typeform onboarding before the restaurant app.
    if (needsOnboarding) {
      navigate({ to: "/onboarding", replace: true });
      return;
    }
    if (!staff) {
      navigate({ to: "/login", replace: true });
    }
  }, [loading, session, staff, platformAdmin, needsOnboarding, pathname, navigate]);

  return <>{children}</>;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go back home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error?.message || "Something went wrong on our end. You can try refreshing or head back home."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "RestoStack — Restaurant Operations OS" },
      {
        name: "description",
        content:
          "All-in-one restaurant management: reservations, guests, floor, menu, and marketing.",
      },
      { name: "author", content: "RestoStack" },
      { property: "og:title", content: "RestoStack — Restaurant Operations OS" },
      {
        property: "og:description",
        content:
          "All-in-one restaurant management: reservations, guests, floor, menu, and marketing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "RestoStack — Restaurant Operations OS" },
      {
        name: "twitter:description",
        content:
          "All-in-one restaurant management: reservations, guests, floor, menu, and marketing.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Cormorant+Garamond:wght@500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ErrorBoundary>{children}</ErrorBoundary>
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RoleProvider>
          <AuthGate>
            <Outlet />
          </AuthGate>
          <Toaster />
        </RoleProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
