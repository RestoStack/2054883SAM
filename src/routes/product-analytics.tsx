import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DollarSign, Package, Star, AlertTriangle, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, Download, Filter,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useState } from "react";

export const Route = createFileRoute("/product-analytics")({
  head: () => ({
    meta: [
      { title: "Product Analytics — Restostacks" },
      { name: "description", content: "Dish and product performance analytics" },
    ],
  }),
  component: ProductAnalyticsPage,
});

/* ─── Mock Data ─── */
const revenueTrend = [
  { month: "Jan", revenue: 42000, cost: 16800, profit: 25200 },
  { month: "Feb", revenue: 45500, cost: 18200, profit: 27300 },
  { month: "Mar", revenue: 48000, cost: 19200, profit: 28800 },
  { month: "Apr", revenue: 51000, cost: 20400, profit: 30600 },
  { month: "May", revenue: 53500, cost: 21400, profit: 32100 },
  { month: "Jun", revenue: 56200, cost: 22480, profit: 33720 },
];

const categoryMix = [
  { name: "Mains", value: 42, color: "hsl(var(--chart-1))" },
  { name: "Appetizers", value: 18, color: "hsl(var(--chart-2))" },
  { name: "Desserts", value: 12, color: "hsl(var(--chart-3))" },
  { name: "Beverages", value: 15, color: "hsl(var(--chart-4))" },
  { name: "Sides", value: 8, color: "hsl(var(--chart-5))" },
  { name: "Specials", value: 5, color: "hsl(var(--muted-foreground))" },
];

const topDishes = [
  { rank: 1, name: "Wagyu Burger", category: "Mains", orders: 342, revenue: 7524, cost: 2736, margin: 63.6, trend: 12.4, rating: 4.8 },
  { rank: 2, name: "Truffle Pasta", category: "Mains", orders: 298, revenue: 7152, cost: 2386, margin: 66.6, trend: 8.1, rating: 4.9 },
  { rank: 3, name: "Seafood Platter", category: "Mains", orders: 187, revenue: 8415, cost: 3740, margin: 55.6, trend: -2.3, rating: 4.7 },
  { rank: 4, name: "Caesar Salad", category: "Appetizers", orders: 276, revenue: 3864, cost: 1104, margin: 71.4, trend: 5.6, rating: 4.5 },
  { rank: 5, name: "Chocolate Lava Cake", category: "Desserts", orders: 245, revenue: 3185, cost: 980, margin: 69.2, trend: 15.2, rating: 4.9 },
  { rank: 6, name: "Craft IPA", category: "Beverages", orders: 410, revenue: 3280, cost: 820, margin: 75.0, trend: 3.8, rating: 4.6 },
  { rank: 7, name: "Lamb Chops", category: "Mains", orders: 156, revenue: 5460, cost: 2496, margin: 54.3, trend: -5.1, rating: 4.4 },
  { rank: 8, name: "Bruschetta", category: "Appetizers", orders: 198, revenue: 2376, cost: 594, margin: 75.0, trend: 1.2, rating: 4.3 },
  { rank: 9, name: "Tiramisu", category: "Desserts", orders: 167, revenue: 2004, cost: 668, margin: 66.7, trend: 7.4, rating: 4.7 },
  { rank: 10, name: "House Red Wine", category: "Beverages", orders: 223, revenue: 3345, cost: 892, margin: 73.3, trend: 9.8, rating: 4.5 },
];

const underperformers = [
  { name: "Quinoa Bowl", category: "Mains", orders: 23, revenue: 391, margin: 48.2, trend: -18.4, reason: "Low order volume" },
  { name: "Vegan Cheesecake", category: "Desserts", orders: 18, revenue: 234, margin: 52.1, reason: "Declining trend", trend: -22.1 },
  { name: "Bone Broth Soup", category: "Appetizers", orders: 31, revenue: 403, margin: 41.5, trend: -8.7, reason: "Low margin" },
  { name: "Sparkling Water", category: "Beverages", orders: 45, revenue: 225, margin: 80.0, trend: -12.3, reason: "Declining trend" },
];

const wasteData = [
  { item: "Avocado", wasted: 4.2, unit: "kg", cost: 42.00, reason: "Over-prep" },
  { item: "Fresh Salmon", wasted: 2.8, unit: "kg", cost: 84.00, reason: "Expiry" },
  { item: "Sourdough Bread", wasted: 6.5, unit: "loaves", cost: 32.50, reason: "Over-bake" },
  { item: "Herb Butter", wasted: 1.2, unit: "kg", cost: 18.00, reason: "Over-prep" },
  { item: "Microgreens", wasted: 0.8, unit: "kg", cost: 24.00, reason: "Expiry" },
];

const contributionData = [
  { name: "Wagyu Burger", contribution: 13.4 },
  { name: "Seafood Platter", contribution: 15.0 },
  { name: "Truffle Pasta", contribution: 12.7 },
  { name: "Lamb Chops", contribution: 9.7 },
  { name: "Craft IPA", contribution: 5.8 },
  { name: "Caesar Salad", contribution: 6.9 },
  { name: "House Red Wine", contribution: 6.0 },
  { name: "Chocolate Lava", contribution: 5.7 },
  { name: "Others", contribution: 24.8 },
];

function ProductAnalyticsPage() {
  const [period, setPeriod] = useState("30d");
  const [category, setCategory] = useState("all");

  const totalRevenue = topDishes.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = topDishes.reduce((s, d) => s + d.orders, 0);
  const avgMargin = (topDishes.reduce((s, d) => s + d.margin, 0) / topDishes.length).toFixed(1);
  const totalWaste = wasteData.reduce((s, w) => s + w.cost, 0);

  const filtered = category === "all"
    ? topDishes
    : topDishes.filter((d) => d.category.toLowerCase() === category);

  return (
    <AppLayout>
      <PageHeader
        title="Product Analytics"
        description="Dish performance, margins, waste tracking, and menu optimization insights"
      >
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="12m">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </PageHeader>

      {/* KPI Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Menu Revenue"
          value={`$${(totalRevenue / 1000).toFixed(1)}k`}
          change={8.4}
          icon={DollarSign}
          subtitle="from top dishes"
        />
        <KpiCard
          title="Total Orders"
          value={totalOrders.toLocaleString()}
          change={5.2}
          icon={Package}
          subtitle="across all items"
        />
        <KpiCard
          title="Avg Food Margin"
          value={`${avgMargin}%`}
          change={1.8}
          icon={TrendingUp}
          subtitle="target: 65%"
        />
        <KpiCard
          title="Waste Cost"
          value={`$${totalWaste.toFixed(0)}`}
          change={-12.3}
          icon={AlertTriangle}
          subtitle="this period"
          invertColor
        />
      </div>

      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="margins">Margins & Mix</TabsTrigger>
          <TabsTrigger value="waste">Waste Tracking</TabsTrigger>
          <TabsTrigger value="underperformers">Underperformers</TabsTrigger>
        </TabsList>

        {/* ── Performance Tab ── */}
        <TabsContent value="performance" className="space-y-6">
          {/* Revenue Trend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Revenue vs Cost Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={revenueTrend}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--chart-1))" fill="url(#revGrad)" strokeWidth={2} name="Revenue" />
                  <Area type="monotone" dataKey="profit" stroke="hsl(var(--chart-2))" fill="url(#profitGrad)" strokeWidth={2} name="Gross Profit" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Dishes Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Top Performing Dishes</CardTitle>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="mr-1.5 h-3.5 w-3.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="mains">Mains</SelectItem>
                  <SelectItem value="appetizers">Appetizers</SelectItem>
                  <SelectItem value="desserts">Desserts</SelectItem>
                  <SelectItem value="beverages">Beverages</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Dish</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-right">Trend</TableHead>
                    <TableHead className="text-right">Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((d) => (
                    <TableRow key={d.rank}>
                      <TableCell className="font-medium text-muted-foreground">{d.rank}</TableCell>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">{d.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{d.orders}</TableCell>
                      <TableCell className="text-right tabular-nums">${d.revenue.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <span className={d.margin >= 65 ? "text-emerald-600 dark:text-emerald-400" : d.margin >= 55 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}>
                          {d.margin}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${d.trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {d.trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {Math.abs(d.trend)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center gap-1 text-sm">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {d.rating}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Margins & Mix Tab ── */}
        <TabsContent value="margins" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Category Mix Pie */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Revenue by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={categoryMix}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryMix.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      formatter={(value: number) => [`${value}%`, "Share"]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Contribution Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Revenue Contribution %</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={contributionData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${v}%`} />
                    <YAxis dataKey="name" type="category" width={110} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      formatter={(value: number) => [`${value}%`, "Contribution"]}
                    />
                    <Bar dataKey="contribution" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Margin Matrix */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Margin Analysis by Dish</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dish</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Food Cost</TableHead>
                    <TableHead className="text-right">Gross Profit</TableHead>
                    <TableHead className="text-right">Margin %</TableHead>
                    <TableHead>Health</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topDishes.map((d) => {
                    const profit = d.revenue - d.cost;
                    return (
                      <TableRow key={d.rank}>
                        <TableCell className="font-medium">{d.name}</TableCell>
                        <TableCell className="text-right tabular-nums">${d.revenue.toLocaleString()}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">${d.cost.toLocaleString()}</TableCell>
                        <TableCell className="text-right tabular-nums">${profit.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{d.margin}%</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              d.margin >= 65
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                : d.margin >= 55
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                  : "bg-red-500/10 text-red-700 dark:text-red-400"
                            }
                          >
                            {d.margin >= 65 ? "Healthy" : d.margin >= 55 ? "Watch" : "Critical"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Waste Tracking Tab ── */}
        <TabsContent value="waste" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">${totalWaste.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">Total waste cost</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                  <Package className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{wasteData.length}</p>
                  <p className="text-xs text-muted-foreground">Items with waste</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                  <TrendingDown className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">-12.3%</p>
                  <p className="text-xs text-muted-foreground">vs last period</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Waste Log</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wasteData.map((w) => (
                    <TableRow key={w.item}>
                      <TableCell className="font-medium">{w.item}</TableCell>
                      <TableCell className="text-right tabular-nums">{w.wasted} {w.unit}</TableCell>
                      <TableCell className="text-right tabular-nums text-red-600 dark:text-red-400">${w.cost.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{w.reason}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Underperformers Tab ── */}
        <TabsContent value="underperformers" className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Items Needing Attention</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dish</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-right">Trend</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead>Suggested Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {underperformers.map((u) => (
                    <TableRow key={u.name}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">{u.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{u.orders}</TableCell>
                      <TableCell className="text-right tabular-nums">${u.revenue}</TableCell>
                      <TableCell className="text-right tabular-nums">{u.margin}%</TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center gap-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                          <ArrowDownRight className="h-3 w-3" />
                          {Math.abs(u.trend)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-red-200 text-xs text-red-700 dark:border-red-800 dark:text-red-400">
                          {u.reason}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.reason === "Low order volume" && "Promote or remove"}
                        {u.reason === "Declining trend" && "Review recipe / pricing"}
                        {u.reason === "Low margin" && "Reduce portion / cost"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

function KpiCard({
  title, value, change, icon: Icon, subtitle, invertColor,
}: {
  title: string; value: string; change: number; icon: React.ElementType; subtitle: string; invertColor?: boolean;
}) {
  const isPositive = invertColor ? change < 0 : change >= 0;
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
            <div className="mt-1 flex items-center gap-1.5">
              <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(change)}%
              </span>
              <span className="text-xs text-muted-foreground">{subtitle}</span>
            </div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
