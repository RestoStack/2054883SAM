import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, Users, Utensils, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { bootstrapStaffAuth } from "@/lib/auth-bootstrap.functions";

const RESTAURANT_SLUG = "italian-bistro";
const STAFF_EMAIL_DOMAIN = "jukebox.local";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

interface Tile {
  id: string;
  full_name: string;
  role: "hostess" | "server";
  avatar_url: string | null;
}

function LoginPage() {
  const navigate = useNavigate();
  const { session, staff, loading, needsOnboarding } = useAuth();
  const [tab, setTab] = useState<"admin" | "staff">("admin");
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("admin@jukebox.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [bootstrapResult, setBootstrapResult] = useState<string | null>(null);
  const bootstrap = useServerFn(bootstrapStaffAuth);

  useEffect(() => {
    if (loading) return;
    if (session && needsOnboarding) {
      navigate({ to: "/onboarding", replace: true });
      return;
    }
    if (session && staff) {
      try {
        sessionStorage.setItem("restostack:portal", "restaurant");
      } catch {
        /* ignore */
      }
      const home =
        staff.role === "admin" ? "/dashboard" :
        staff.role === "hostess" ? "/host-stand" : "/server-app";
      navigate({ to: home, replace: true });
    }
  }, [loading, session, staff, needsOnboarding, navigate]);

  // Auto-run bootstrap on first mount (idempotent — creates auth users for unlinked staff).
  useEffect(() => {
    (async () => {
      try {
        await bootstrap();
      } catch (e) {
        console.warn("Bootstrap failed (may already be done):", e);
      }
      const { data } = await supabase.rpc("v2_get_staff_tiles", { _slug: RESTAURANT_SLUG });
      if (data) setTiles(data as Tile[]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    let { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error && error.message.toLowerCase().includes("invalid")) {
      // Maybe bootstrap hadn't finished; try once more after re-running it.
      try { await bootstrap(); } catch {}
      ({ error } = await supabase.auth.signInWithPassword({ email, password }));
    }
    setBusy(false);
    if (error) setError(error.message);
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTile) return;
    setError(null);
    setBusy(true);
    const creds = {
      email: `staff-${selectedTile.id}@${STAFF_EMAIL_DOMAIN}`,
      password: `pin-${pin}`,
    };
    let { error } = await supabase.auth.signInWithPassword(creds);
    if (error && error.message.toLowerCase().includes("invalid")) {
      try { await bootstrap(); } catch {}
      ({ error } = await supabase.auth.signInWithPassword(creds));
    }
    setBusy(false);
    if (error) setError("Wrong PIN. Try again.");
  };

  const handleBootstrap = async () => {
    setBusy(true);
    setBootstrapResult(null);
    try {
      const res = await bootstrap();
      setBootstrapResult(res.message);
      // Reload tiles
      const { data } = await supabase.rpc("v2_get_staff_tiles", { _slug: RESTAURANT_SLUG });
      if (data) setTiles(data as Tile[]);
    } catch (err: any) {
      setBootstrapResult("Error: " + (err?.message ?? String(err)));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Italian Bistro</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to the RestoStack demo</p>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="grid grid-cols-2 border-b border-border">
            <button
              onClick={() => { setTab("admin"); setError(null); }}
              className={`py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                tab === "admin" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Shield className="size-4" /> Admin
            </button>
            <button
              onClick={() => { setTab("staff"); setError(null); }}
              className={`py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                tab === "staff" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="size-4" /> Staff PIN
            </button>
          </div>

          <div className="p-6">
            {tab === "admin" ? (
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    required
                  />
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
                >
                  {busy ? "Signing in…" : "Sign in"}
                </button>
                <p className="text-[11px] text-muted-foreground text-center">
                  Default admin: <code>admin@jukebox.com</code> / <code>admin1234</code>
                </p>
              </form>
            ) : selectedTile ? (
              <form onSubmit={handlePinSubmit} className="space-y-4">
                <div className="text-center">
                  <div className="mx-auto size-14 rounded-full bg-primary/10 grid place-items-center mb-2">
                    {selectedTile.role === "hostess" ? <Users className="size-6" /> : <Utensils className="size-6" />}
                  </div>
                  <p className="text-base font-semibold">{selectedTile.full_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{selectedTile.role}</p>
                </div>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter PIN"
                  autoFocus
                  className="w-full text-center text-2xl tracking-widest rounded-lg border border-input bg-background py-3"
                  required
                />
                {error && <p className="text-xs text-destructive text-center">{error}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setSelectedTile(null); setPin(""); setError(null); }}
                    className="flex-1 rounded-lg border border-input py-2 text-sm font-medium hover:bg-accent"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={busy || !pin}
                    className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {busy ? "…" : "Sign in"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                {tiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No staff found. Run first-time setup below.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {tiles.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTile(t)}
                        className="flex flex-col items-center gap-2 rounded-xl border border-border bg-background p-4 hover:border-primary hover:bg-accent transition-colors"
                      >
                        <div className="size-12 rounded-full bg-primary/10 grid place-items-center">
                          {t.role === "hostess" ? <Users className="size-5" /> : <Utensils className="size-5" />}
                        </div>
                        <span className="text-sm font-medium">{t.full_name}</span>
                        <span className="text-[11px] text-muted-foreground capitalize">{t.role}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Platform operators:{" "}
          <a href="/super-admin-login" className="underline underline-offset-2 hover:text-foreground">
            Super Admin login
          </a>
        </p>

        <details className="mt-4 text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">First-time setup</summary>
          <div className="mt-3 rounded-lg border border-border bg-card p-4 space-y-2">
            <p>
              Run this once to create login accounts for all seeded staff
              (admin@jukebox.com / admin1234, plus PINs 1234/1111/2222).
            </p>
            <button
              onClick={handleBootstrap}
              disabled={busy}
              className="w-full rounded-md bg-secondary py-1.5 text-xs font-medium hover:bg-secondary/80 disabled:opacity-50"
            >
              {busy ? "Working…" : "Run bootstrap"}
            </button>
            {bootstrapResult && <p className="text-[11px]">{bootstrapResult}</p>}
          </div>
        </details>
      </div>
    </div>
  );
}
