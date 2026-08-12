import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { bootstrapStaffAuth } from "@/lib/auth-bootstrap.functions";
import { InviteOnlyPanel } from "@/components/InviteOnlyPanel";
import { isDemoAccessEnabled } from "@/lib/ship-mode";

const ADMIN_PASSCODE = "3180";
const ADMIN_EMAIL = "admin@jukebox.com";
const ADMIN_PASSWORD = "admin1234";

export const Route = createFileRoute("/admin-login")({
  component: AdminLoginPage,
});

async function signInAsDemoAdmin(bootstrap: () => Promise<unknown>): Promise<string | null> {
  let { error } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (error && error.message.toLowerCase().includes("invalid")) {
    try {
      await bootstrap();
    } catch {
      /* ignore */
    }
    ({ error } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }));
  }
  return error ? error.message : null;
}

function AdminLoginPage() {
  const navigate = useNavigate();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const bootstrap = useServerFn(bootstrapStaffAuth);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  if (!isDemoAccessEnabled()) {
    return (
      <InviteOnlyPanel
        title="Sample access is off"
        description="This deploy is invite-only. Sign in with your restaurant credentials, or request a demo if you need access."
      />
    );
  }

  const goToDemo = async () => {
    setBusy(true);
    setError(null);
    const err = await signInAsDemoAdmin(() => bootstrap());
    setBusy(false);
    if (err) {
      setError("Could not start the demo session. Try again in a moment.");
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (passcode !== ADMIN_PASSCODE) {
      setError("Incorrect passcode");
      return;
    }
    await goToDemo();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
            <Sparkles className="size-3" /> Italian Bistro demo
          </div>
          <CardTitle>Enter the demo</CardTitle>
          <CardDescription>
            Explore Italian Bistro with live sample bookings, guests, menu, and orders. No sign-up.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={goToDemo} disabled={busy} className="w-full">
            {busy ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" /> Starting demo…
              </>
            ) : (
              "Open Italian Bistro sample"
            )}
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            Or sign in at{" "}
            <Link to="/login" className="underline underline-offset-2">
              /login
            </Link>{" "}
            with <code className="rounded bg-muted px-1">admin@jukebox.com</code> /{" "}
            <code className="rounded bg-muted px-1">admin1234</code>
          </p>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
              <span className="bg-card px-2 text-muted-foreground">or admin passcode</span>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="passcode">Passcode</Label>
              <Input
                id="passcode"
                type="password"
                inputMode="numeric"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter passcode"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" variant="outline" className="w-full" disabled={busy}>
              {busy ? "Unlocking…" : "Unlock"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
