import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Heart,
  Users,
  DollarSign,
  Plus,
  Award,
  Gift,
  Repeat,
  Loader2,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAdjustLoyaltyPoints,
  useCreateCustomer,
  useCustomers,
  useLoyaltyStats,
} from "@/lib/v2-data";

export const Route = createFileRoute("/loyalty")({
  head: () => ({ meta: [{ title: "Loyalty — RestoStack" }] }),
  component: Loyalty,
});

function Loyalty() {
  const { data, isLoading } = useLoyaltyStats();
  const { data: customers = [] } = useCustomers();
  const createCustomer = useCreateCustomer();
  const adjustPoints = useAdjustLoyaltyPoints();

  const [addOpen, setAddOpen] = useState(false);
  const [pointsOpen, setPointsOpen] = useState(false);
  const [pointsMode, setPointsMode] = useState<"earn" | "redeem">("earn");

  const [memberForm, setMemberForm] = useState({ name: "", email: "", phone: "", startingPoints: "0" });
  const [pointsForm, setPointsForm] = useState({ customerId: "", points: "" });

  const members = data?.members ?? 0;
  const totalVisits = data?.totalVisits ?? 0;
  const creditEarned = data?.creditEarned ?? 0;
  const creditRedeemed = data?.creditRedeemed ?? 0;
  const topMembers = data?.topMembers ?? [];
  const recentTx = data?.recentTx ?? [];

  const customerOptions = useMemo(() => {
    const fromStats = (data?.allCustomers ?? []).map((c: { id: string; full_name: string; loyalty_points?: number }) => ({
      id: c.id,
      name: c.full_name ?? "Guest",
      points: c.loyalty_points ?? 0,
    }));
    if (fromStats.length) return fromStats;
    return customers.map((c) => ({ id: c.id, name: c.name, points: c.points }));
  }, [data?.allCustomers, customers]);

  const openPointsDialog = (mode: "earn" | "redeem") => {
    setPointsMode(mode);
    setPointsForm({ customerId: customerOptions[0]?.id ?? "", points: "" });
    setPointsOpen(true);
  };

  const handleAddMember = async () => {
    if (!memberForm.name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      const created = await createCustomer.mutateAsync({
        full_name: memberForm.name,
        email: memberForm.email || undefined,
        phone: memberForm.phone || undefined,
      });
      const startPts = parseInt(memberForm.startingPoints, 10);
      if (created?.id && startPts > 0) {
        await adjustPoints.mutateAsync({
          customer_id: created.id,
          points: startPts,
          mode: "earn",
          description: "Welcome bonus",
        });
      }
      toast.success(startPts > 0 ? `Member added with ${startPts} welcome points` : "Member added");
      setAddOpen(false);
      setMemberForm({ name: "", email: "", phone: "", startingPoints: "0" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add member");
    }
  };

  const handleAdjustPoints = async () => {
    const pts = parseInt(pointsForm.points, 10);
    if (!pointsForm.customerId) {
      toast.error("Select a customer");
      return;
    }
    if (!Number.isFinite(pts) || pts <= 0) {
      toast.error("Enter a valid points amount");
      return;
    }
    try {
      await adjustPoints.mutateAsync({
        customer_id: pointsForm.customerId,
        points: pts,
        mode: pointsMode,
      });
      toast.success(pointsMode === "earn" ? `Earned ${pts} points` : `Redeemed ${pts} points`);
      setPointsOpen(false);
      setPointsForm({ customerId: "", points: "" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update points");
    }
  };

  const busy = createCustomer.isPending || adjustPoints.isPending;

  return (
    <AppShell>
      <PageHeader
        title="Loyalty Program"
        description="Points and visits for guests of this restaurant only"
        icon={Heart}
        iconBg="bg-accent"
        iconColor="text-primary fill-primary/30"
        crumbs={[{ label: "Marketing", to: "/marketing" }, { label: "Loyalty" }]}
        actions={
          <>
            <button
              onClick={() => openPointsDialog("earn")}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted/50"
            >
              <Gift className="size-4" /> Earn Points
            </button>
            <button
              onClick={() => openPointsDialog("redeem")}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted/50"
            >
              <DollarSign className="size-4" /> Redeem Points
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="size-4" /> Add New Member
            </button>
          </>
        }
      />

      <div className="p-4 lg:p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { l: "Members", v: String(members), i: Users, bg: "bg-accent text-primary" },
            { l: "Total Visits", v: String(totalVisits), i: Repeat, bg: "bg-success/15 text-success" },
            { l: "Points Earned", v: String(creditEarned), i: DollarSign, bg: "bg-warning/20 text-warning" },
            { l: "Points Redeemed", v: String(creditRedeemed), i: Gift, bg: "bg-info/15 text-info" },
          ].map((s) => (
            <div key={s.l} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className={`size-10 rounded-full flex items-center justify-center ${s.bg}`}>
                  <s.i className="size-5" />
                </div>
                <div className="text-sm text-muted-foreground">{s.l}</div>
              </div>
              <div className="mt-2 text-2xl font-bold">{isLoading ? "…" : s.v}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Top Members</h3>
              <Link to="/customers" className="text-xs text-primary font-medium hover:underline">
                View customers →
              </Link>
            </div>
            {topMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No loyalty activity yet for this restaurant.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {topMembers.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <div className="size-8 rounded-full bg-accent flex items-center justify-center">
                      <Award className="size-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {m.visits} visits · {m.points} pts
                      </div>
                    </div>
                    <div className="font-semibold">{m.spent}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-4">Recent Activity</h3>
            {recentTx.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No point transactions yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {recentTx.map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.desc}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{t.date}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5 text-primary" /> Add New Member
            </DialogTitle>
            <DialogDescription>Create a loyalty member and optionally grant welcome points.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="member-name" className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1.5">
                <User className="size-3.5" /> Full name
              </Label>
              <Input
                id="member-name"
                placeholder="Jane Doe"
                value={memberForm.name}
                onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-email" className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1.5">
                <Mail className="size-3.5" /> Email
              </Label>
              <Input
                id="member-email"
                type="email"
                placeholder="jane@example.com"
                value={memberForm.email}
                onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-phone" className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1.5">
                <Phone className="size-3.5" /> Phone
              </Label>
              <Input
                id="member-phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={memberForm.phone}
                onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Starting points</Label>
              <Select
                value={memberForm.startingPoints}
                onValueChange={(v) => setMemberForm({ ...memberForm, startingPoints: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">None (0 pts)</SelectItem>
                  <SelectItem value="100">Welcome bonus (100 pts)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setAddOpen(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleAddMember}
              disabled={busy || !memberForm.name.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Saving…" : "Add Member"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pointsOpen} onOpenChange={setPointsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{pointsMode === "earn" ? "Earn Points" : "Redeem Points"}</DialogTitle>
            <DialogDescription>
              {pointsMode === "earn"
                ? "Award loyalty points to a customer."
                : "Redeem points from a customer's balance."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Customer</Label>
              {customerOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No customers yet. Add a member first.</p>
              ) : (
                <Select
                  value={pointsForm.customerId}
                  onValueChange={(v) => setPointsForm({ ...pointsForm, customerId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customerOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.points} pts)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="points-amount" className="text-xs font-medium text-muted-foreground">
                Points amount
              </Label>
              <Input
                id="points-amount"
                type="number"
                min={1}
                placeholder="50"
                value={pointsForm.points}
                onChange={(e) => setPointsForm({ ...pointsForm, points: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setPointsOpen(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleAdjustPoints}
              disabled={busy || !pointsForm.customerId || !pointsForm.points}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin inline mr-1" /> Saving…
                </>
              ) : pointsMode === "earn" ? (
                "Earn Points"
              ) : (
                "Redeem Points"
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
