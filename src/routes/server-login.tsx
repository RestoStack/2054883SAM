import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Delete, LockKeyhole, ShieldCheck } from "lucide-react";
import { listServersFn, loginWithPinFn } from "@/lib/pos.functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { isDemoAccessEnabled, isServerPadEnabled } from "@/lib/ship-mode";

export const Route = createFileRoute("/server-login")({
  head: () => ({
    meta: [
      { title: "Server Sign In" },
      { name: "description", content: "Tablet PIN sign-in for floor staff." },
    ],
  }),
  beforeLoad: () => {
    if (!isServerPadEnabled()) {
      throw redirect({ to: "/login" });
    }
  },
  component: ServerLoginPage,
});

type ServerOpt = { id: string; name: string; color: string; role: "server" | "admin" };

function ServerLoginPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const listServers = useServerFn(listServersFn);
  const login = useServerFn(loginWithPinFn);

  const { data: servers, isLoading } = useQuery<ServerOpt[]>({
    queryKey: ["servers", "list"],
    queryFn: () => listServers(),
  });

  const [selected, setSelected] = useState<ServerOpt | null>(null);
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleDigit = (d: string) => {
    if (submitting || pin.length >= 6) return;
    setPin((p) => p + d);
  };
  const handleBack = () => setPin((p) => p.slice(0, -1));

  const submit = async (currentPin: string) => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await login({ data: { serverId: selected.id, pin: currentPin } });
      toast.success(`Welcome, ${selected.name}`);
      await router.invalidate();
      navigate({ to: "/server-app" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sign in failed");
      setPin("");
    } finally {
      setSubmitting(false);
    }
  };

  // auto-submit when PIN length reaches 4
  const handleDigitAndMaybeSubmit = (d: string) => {
    if (submitting || pin.length >= 6) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      // small delay so the last dot renders before request
      setTimeout(() => submit(next), 80);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {!selected ? (
          <Card className="p-6 rounded-2xl">
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <ShieldCheck className="size-3.5" /> Staff sign in
              </div>
              <h1 className="mt-1 text-xl font-semibold tracking-tight">Who's on shift?</h1>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {isLoading && (
                <div className="col-span-2 text-center text-sm text-muted-foreground py-8">
                  Loading staff…
                </div>
              )}
              {servers?.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-4 hover:bg-accent transition active:scale-[0.98]"
                >
                  <div
                    className="size-12 rounded-full flex items-center justify-center text-white text-lg font-semibold"
                    style={{ background: s.color }}
                  >
                    {s.name[0]}
                  </div>
                  <div className="text-sm font-medium">{s.name}</div>
                  {s.role === "admin" && (
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Manager
                    </div>
                  )}
                </button>
              ))}
            </div>
            {isDemoAccessEnabled() && (
              <p className="mt-5 text-[11px] text-muted-foreground text-center">
                Demo PINs: staff <span className="font-mono">1234</span> · manager <span className="font-mono">9999</span>
              </p>
            )}
            <p className="mt-3 text-[11px] text-amber-800 text-center">
              Shared demo POS — not tenant-isolated. Do not use for live multi-restaurant service.
            </p>
          </Card>
        ) : (
          <Card className="p-6 rounded-2xl">
            <div className="text-center mb-5">
              <div
                className="mx-auto size-14 rounded-full flex items-center justify-center text-white text-xl font-semibold"
                style={{ background: selected.color }}
              >
                {selected.name[0]}
              </div>
              <h1 className="mt-3 text-lg font-semibold">Hi, {selected.name}</h1>
              <div className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                <LockKeyhole className="size-3" /> Enter your PIN
              </div>
            </div>

            <div className="flex justify-center gap-3 mb-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "size-3 rounded-full transition",
                    i < pin.length ? "bg-foreground" : "bg-muted"
                  )}
                />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button
                  key={n}
                  onClick={() => handleDigitAndMaybeSubmit(String(n))}
                  disabled={submitting}
                  className="h-14 rounded-xl bg-card border border-border text-lg font-medium hover:bg-accent active:scale-[0.97] transition disabled:opacity-50"
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setSelected(null)}
                className="h-14 rounded-xl text-xs text-muted-foreground hover:bg-accent transition"
              >
                Back
              </button>
              <button
                onClick={() => handleDigitAndMaybeSubmit("0")}
                disabled={submitting}
                className="h-14 rounded-xl bg-card border border-border text-lg font-medium hover:bg-accent active:scale-[0.97] transition disabled:opacity-50"
              >
                0
              </button>
              <button
                onClick={handleBack}
                disabled={submitting || pin.length === 0}
                className="h-14 rounded-xl flex items-center justify-center hover:bg-accent transition disabled:opacity-30"
                aria-label="Delete digit"
              >
                <Delete className="size-5" />
              </button>
            </div>

            {submitting && (
              <div className="text-center text-xs text-muted-foreground mt-4">
                Signing in…
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-3 text-xs"
              onClick={() => {
                setSelected(null);
                setPin("");
              }}
            >
              Choose someone else
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
