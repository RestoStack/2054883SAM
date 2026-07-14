import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  BarChart3, TrendingUp, TrendingDown, Minus, Flame, ArrowUpRight,
  Trophy, Medal, Award, Copy, Printer, Search, Sparkles,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/product-analytics")({
  head: () => ({
    meta: [
      { title: "Product Analytics — RestoStack" },
      { name: "description", content: "Combo intelligence, upsell engine, and item performance" },
    ],
  }),
  component: ProductAnalyticsPage,
});

// ---------- Mock data ----------
type Combo = {
  id: string;
  a: string; b: string;
  rate: number; lift: number;
  badge: "Hot" | "Rising" | "Classic";
  stage: "Starter → Main" | "Main → Drink" | "Main → Dessert";
};

const COMBOS: Combo[] = [
  { id: "c1", a: "Smash Double", b: "Truffle Fries", rate: 67, lift: 18, badge: "Hot", stage: "Starter → Main" },
  { id: "c2", a: "Margherita Pizza", b: "House Red", rate: 54, lift: 22, badge: "Classic", stage: "Main → Drink" },
  { id: "c3", a: "Ribeye 12oz", b: "Crème Brûlée", rate: 41, lift: 26, badge: "Rising", stage: "Main → Dessert" },
  { id: "c4", a: "Caesar Salad", b: "Grilled Salmon", rate: 38, lift: 14, badge: "Classic", stage: "Starter → Main" },
  { id: "c5", a: "Wings 10pc", b: "Local IPA", rate: 62, lift: 12, badge: "Hot", stage: "Main → Drink" },
  { id: "c6", a: "Carbonara", b: "Tiramisu", rate: 33, lift: 16, badge: "Rising", stage: "Main → Dessert" },
];

type Upsell = {
  rank: number; name: string; reason: string; price: number; margin: number;
};

const UPSELLS: Upsell[] = [
  { rank: 1, name: "Truffle Fries", reason: "81% take rate with the Smash Double", price: 9, margin: 78 },
  { rank: 2, name: "House Red (glass)", reason: "Pairs with 54% of pizza orders", price: 12, margin: 72 },
  { rank: 3, name: "Crème Brûlée", reason: "Lifts ribeye check by $26 on avg.", price: 11, margin: 68 },
  { rank: 4, name: "Local IPA", reason: "62% co-order rate with wings", price: 8, margin: 64 },
  { rank: 5, name: "Tiramisu", reason: "Rising +12% week over week", price: 10, margin: 70 },
];

type Item = {
  id: string; name: string; category: string;
  share: number; margin: number; orders: number; trend: "up" | "down" | "flat";
  price: number; foodCost: number;
};

const ITEMS: Item[] = [
  { id: "i1", name: "Smash Double", category: "Burger", share: 18, margin: 62, orders: 412, trend: "up", price: 19, foodCost: 7.2 },
  { id: "i2", name: "Margherita Pizza", category: "Pizza", share: 14, margin: 70, orders: 388, trend: "up", price: 17, foodCost: 5.1 },
  { id: "i3", name: "Ribeye 12oz", category: "Steak", share: 12, margin: 48, orders: 142, trend: "flat", price: 42, foodCost: 21.8 },
  { id: "i4", name: "Carbonara", category: "Pasta", share: 9, margin: 66, orders: 254, trend: "down", price: 21, foodCost: 7.1 },
  { id: "i5", name: "Caesar Salad", category: "Starter", share: 7, margin: 74, orders: 301, trend: "up", price: 14, foodCost: 3.6 },
  { id: "i6", name: "Grilled Salmon", category: "Mains", share: 8, margin: 55, orders: 187, trend: "flat", price: 28, foodCost: 12.6 },
  { id: "i7", name: "Wings 10pc", category: "Starter", share: 6, margin: 68, orders: 276, trend: "up", price: 16, foodCost: 5.1 },
  { id: "i8", name: "Tiramisu", category: "Dessert", share: 4, margin: 76, orders: 198, trend: "up", price: 10, foodCost: 2.4 },
];

const sparkData = (seed: number) =>
  Array.from({ length: 28 }, (_, i) => ({
    d: i,
    v: Math.round(40 + Math.sin(i / 3 + seed) * 14 + (i * (seed % 3 + 1)) / 4 + (seed % 5) * 3),
  }));

// ---------- Page ----------
function ProductAnalyticsPage() {
  const [range, setRange] = useState("week");
  const [stage, setStage] = useState("all");
  const [comboSort, setComboSort] = useState("rate");
  const [itemSort, setItemSort] = useState("share");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [briefOpen, setBriefOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const filteredCombos = useMemo(() => {
    const list = COMBOS.filter((c) => stage === "all" || c.stage === stage);
    return [...list].sort((a, b) =>
      comboSort === "rate" ? b.rate - a.rate : b.lift - a.lift
    );
  }, [stage, comboSort]);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(ITEMS.map((i) => i.category)))],
    []
  );

  const filteredItems = useMemo(() => {
    let list = ITEMS.filter((i) => category === "all" || i.category === category);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      if (itemSort === "share") return b.share - a.share;
      if (itemSort === "margin") return b.margin - a.margin;
      return b.orders - a.orders;
    });
  }, [category, query, itemSort]);

  const shift = new Date().getHours() < 16 ? "Lunch" : "Dinner";
  const today = new Date().toLocaleDateString("en-CA", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const briefingText = useMemo(() => {
    const lines = [
      `Server Briefing — ${today} (${shift})`,
      "",
      ...UPSELLS.map(
        (u) =>
          `#${u.rank} ${u.name} — $${u.price} (${u.margin}% margin)\n  • ${u.reason}\n  • Suggest after the guest orders their main; mention as a chef's pick.`
      ),
    ];
    return lines.join("\n\n");
  }, [today, shift]);

  return (
    <AppShell>
      <PageHeader
        title="Product Analytics"
        description="Combo intelligence, upsell engine, and item performance"
        icon={BarChart3}
        actions={
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This week</SelectItem>
              <SelectItem value="month">This month</SelectItem>
              <SelectItem value="custom">Custom…</SelectItem>
            </SelectContent>
          </Select>

        }
      />

      <div className="px-4 sm:px-5 py-4 sm:py-5 space-y-5 sm:space-y-6">
        {/* Section 1 — Summary cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Top seller"
            value="Smash Double"
            sub="412 orders this week"
            icon={<Flame className="size-4 text-orange-500" />}
          />
          <MetricCard
            label="Average check"
            value="$48.20"
            delta={{ value: "+6.4%", positive: true }}
            sub="vs prior period"
          />
          <MetricCard
            label="Upsell rate"
            value="34%"
            sub="Target 40%"
            delta={{ value: "-6 pts", positive: false }}
          />
          <MetricCard
            label="Avg combo lift"
            value="$18.40"
            sub="per upsell event"
            delta={{ value: "+$1.20", positive: true }}
          />
        </div>

        {/* Section 2 — Combo Intelligence */}
        <Card className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold font-sans text-foreground">Best item combos</h2>
              <p className="text-sm text-muted-foreground">Ranked by co-order frequency</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stages</SelectItem>
                  <SelectItem value="Starter → Main">Starter → Main</SelectItem>
                  <SelectItem value="Main → Drink">Main → Drink</SelectItem>
                  <SelectItem value="Main → Dessert">Main → Dessert</SelectItem>
                </SelectContent>
              </Select>
              <Select value={comboSort} onValueChange={setComboSort}>
                <SelectTrigger className="w-full sm:w-[170px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rate">Co-order rate</SelectItem>
                  <SelectItem value="lift">Revenue lift</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">

            {filteredCombos.map((c) => (
              <div key={c.id} className="rounded-xl border border-border bg-card p-4 hover:shadow-sm transition-shadow">
                <BadgePill badge={c.badge} />
                <div className="mt-2 font-semibold text-foreground">
                  {c.a} <span className="text-muted-foreground font-normal">+</span> {c.b}
                </div>
                <div className="mt-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{c.rate}%</span> of orders include both
                </div>
                <div className="mt-1 text-sm text-emerald-600 font-medium">
                  +${c.lift} per table
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Section 3 — Tonight's Upsell Engine */}
        <Card className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold font-sans text-foreground flex items-center gap-2">
                <Sparkles className="size-4 text-amber-500" /> Tonight's upsell picks
              </h2>
              <p className="text-sm text-muted-foreground">Sorted by margin × conversion rate</p>
            </div>
            <Button onClick={() => setBriefOpen(true)} className="w-full sm:w-auto">
              Generate server briefing <ArrowUpRight className="size-4 ml-1" />
            </Button>
          </div>

          <ul className="divide-y divide-border">
            {UPSELLS.map((u) => (
              <li key={u.rank} className="flex items-center gap-3 sm:gap-4 py-3">
                <RankBadge rank={u.rank} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground truncate">{u.name}</div>
                  <div className="text-sm text-muted-foreground truncate">{u.reason}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold">${u.price.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">{u.margin}% margin</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        {/* Section 4 — Item Performance Table */}
        <Card className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold font-sans text-foreground">Item performance</h2>
              <p className="text-sm text-muted-foreground">Tap any row for the full breakdown</p>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search items…"
                  className="pl-8 w-full sm:w-[200px]"
                />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c === "all" ? "All categories" : c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={itemSort} onValueChange={setItemSort}>
                <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="share">Revenue share</SelectItem>
                  <SelectItem value="margin">Margin %</SelectItem>
                  <SelectItem value="velocity">Weekly velocity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>


          {/* Mobile: card list */}
          <ul className="md:hidden divide-y divide-border">
            {filteredItems.map((i) => (
              <li
                key={i.id}
                onClick={() => setSelectedItem(i)}
                className="py-3 cursor-pointer active:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-foreground truncate">{i.name}</div>
                    <div className="text-xs text-muted-foreground">{i.category}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <TrendIcon t={i.trend} />
                    <span className="text-sm tabular-nums">{i.margin}%</span>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-lg bg-muted overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-lg" style={{ width: `${i.share * 4}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">{i.share}%</span>
                  <span className="text-xs text-muted-foreground tabular-nums w-16 text-right">{i.orders}/wk</span>
                </div>
              </li>
            ))}
            {filteredItems.length === 0 && (
              <li className="py-8 text-center text-muted-foreground text-sm">No items match.</li>
            )}
          </ul>

          {/* Desktop: full table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 font-medium">Item</th>
                  <th className="py-2 font-medium">Category</th>
                  <th className="py-2 font-medium w-[220px]">Revenue share</th>
                  <th className="py-2 font-medium">Margin %</th>
                  <th className="py-2 font-medium">Orders/wk</th>
                  <th className="py-2 font-medium">Trend</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((i) => (
                  <tr
                    key={i.id}
                    onClick={() => setSelectedItem(i)}
                    className="border-b border-border last:border-0 cursor-pointer hover:bg-muted/40 transition-colors"
                  >
                    <td className="py-3 font-medium text-foreground">{i.name}</td>
                    <td className="py-3 text-muted-foreground">{i.category}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-full max-w-[140px] rounded-lg bg-muted overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-lg" style={{ width: `${i.share * 4}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">{i.share}%</span>
                      </div>
                    </td>
                    <td className="py-3 tabular-nums">{i.margin}%</td>
                    <td className="py-3 tabular-nums">{i.orders}</td>
                    <td className="py-3"><TrendIcon t={i.trend} /></td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No items match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Server Briefing Sheet */}
      <Sheet open={briefOpen} onOpenChange={setBriefOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Server briefing</SheetTitle>
            <SheetDescription>{today} · {shift} shift</SheetDescription>
          </SheetHeader>
          <div className="mt-5 space-y-4">
            {UPSELLS.map((u) => (
              <div key={u.rank} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">#{u.rank} {u.name}</div>
                  <div className="text-sm text-muted-foreground">${u.price.toFixed(2)} · {u.margin}%</div>
                </div>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  {u.reason}. Suggest after the guest orders their main and frame it as the chef's pick of the night.
                </p>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigator.clipboard?.writeText(briefingText)}
              >
                <Copy className="size-4 mr-2" /> Copy
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => window.print()}>
                <Printer className="size-4 mr-2" /> Print
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Item detail Sheet */}
      <Sheet open={!!selectedItem} onOpenChange={(o) => !o && setSelectedItem(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedItem && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedItem.name}</SheetTitle>
                <SheetDescription>{selectedItem.category} · ${selectedItem.price.toFixed(2)}</SheetDescription>
              </SheetHeader>

              <div className="mt-5 space-y-5">
                <div>
                  <div className="text-sm font-medium mb-2">Orders — last 4 weeks</div>
                  <div className="h-32">
                    <ResponsiveContainer>
                      <LineChart data={sparkData(selectedItem.name.length)}>
                        <XAxis dataKey="d" hide />
                        <YAxis hide />
                        <Tooltip cursor={false} contentStyle={{ fontSize: 12 }} />
                        <Line type="monotone" dataKey="v" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Top combos featuring this item</div>
                  <ul className="space-y-1.5 text-sm">
                    {COMBOS.filter((c) => c.a === selectedItem.name || c.b === selectedItem.name).slice(0, 3).map((c) => (
                      <li key={c.id} className="flex justify-between rounded-lg bg-muted/50 px-3 py-2">
                        <span>{c.a} + {c.b}</span>
                        <span className="text-muted-foreground">{c.rate}% · +${c.lift}</span>
                      </li>
                    ))}
                    {COMBOS.filter((c) => c.a === selectedItem.name || c.b === selectedItem.name).length === 0 && (
                      <li className="text-muted-foreground text-sm">No combos yet.</li>
                    )}
                  </ul>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Margin breakdown</div>
                  <div className="rounded-xl border border-border p-3 text-sm space-y-1.5">
                    <Row label="Selling price" value={`$${selectedItem.price.toFixed(2)}`} />
                    <Row label="Food cost" value={`$${selectedItem.foodCost.toFixed(2)}`} />
                    <Row label="Margin" value={`${selectedItem.margin}%`} bold />
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Suggested action</div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline">Push as upsell</Button>
                    <Button size="sm" variant="outline">Feature in combo</Button>
                    <Button size="sm" variant="outline">Review food cost</Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

// ---------- Bits ----------
function MetricCard({
  label, value, sub, delta, icon,
}: {
  label: string; value: string; sub?: string;
  delta?: { value: string; positive: boolean };
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-muted/40 p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</div>
        {icon}
      </div>
      <div className="mt-2 text-2xl font-bold text-foreground">{value}</div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {delta && (
          <span className={delta.positive ? "text-emerald-600 font-medium" : "text-rose-600 font-medium"}>
            {delta.value}
          </span>
        )}
        {sub && <span className="text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}

function BadgePill({ badge }: { badge: Combo["badge"] }) {
  const styles =
    badge === "Hot" ? "bg-orange-100 text-orange-700 border-orange-200"
    : badge === "Rising" ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : "bg-blue-100 text-blue-700 border-blue-200";
  return (
    <Badge className={`${styles} border rounded-full text-[11px] px-2 py-0.5 font-medium`}>
      {badge}
    </Badge>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const map: Record<number, { bg: string; icon: React.ReactNode }> = {
    1: { bg: "bg-amber-100 text-amber-700", icon: <Trophy className="size-4" /> },
    2: { bg: "bg-slate-200 text-slate-700", icon: <Medal className="size-4" /> },
    3: { bg: "bg-orange-100 text-orange-700", icon: <Award className="size-4" /> },
  };
  const m = map[rank] ?? { bg: "bg-muted text-muted-foreground", icon: <span className="text-xs font-semibold">#{rank}</span> };
  return (
    <div className={`size-9 rounded-full flex items-center justify-center ${m.bg} shrink-0`}>
      {m.icon}
    </div>
  );
}

function TrendIcon({ t }: { t: "up" | "down" | "flat" }) {
  if (t === "up") return <TrendingUp className="size-4 text-emerald-600" />;
  if (t === "down") return <TrendingDown className="size-4 text-rose-600" />;
  return <Minus className="size-4 text-muted-foreground" />;
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}
