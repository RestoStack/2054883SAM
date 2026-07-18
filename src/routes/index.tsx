import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Sparkles, Bell, ChevronDown, LayoutDashboard, CalendarDays, Users, Gift,
  Megaphone, ShoppingBag, BarChart3, FileText, Plug, Settings as SettingsIcon,
  HelpCircle, Calendar, UserCircle2, Award, Send, LineChart, Store,
  CheckCircle2, Lock, Linkedin, Instagram, Mail, ArrowRight,
  ClipboardList, Utensils, Network, Wine, Coffee, Pizza, Building2, Truck,
  Check, Heart, Zap, Shield,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, PieChart, Pie, Cell, Line, LineChart as RLineChart } from "recharts";
import logoUrl from "@/assets/restostack-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { DemoRequestDialog } from "@/components/DemoRequestDialog";
import jukeboxLogo from "@/assets/logos/jukebox.png";
import industriaLogo from "@/assets/logos/industria.webp";
import bistroNoirLogo from "@/assets/logos/bistronoir.png";
import copperPotLogo from "@/assets/logos/copperpot.png";
import saffronSageLogo from "@/assets/logos/saffronsage.png";
import firesideLogo from "@/assets/logos/fireside.png";
import harborFishLogo from "@/assets/logos/harborfish.png";
import terraVerdeLogo from "@/assets/logos/terraverde.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RestoStack — The OS for Restaurants is Coming" },
      { name: "description", content: "RestoStack connects reservations, guest profiles, loyalty, server ordering, and marketing automation into one intelligent platform." },
      { property: "og:title", content: "RestoStack — The OS for Restaurants" },
      { property: "og:description", content: "One intelligent platform for modern restaurants. Join the early access list." },
    ],
  }),
  component: ComingSoon,
});

const GREEN = "#39D400";

const Logo = ({ className = "", invert = false }: { className?: string; invert?: boolean }) => (
  <img
    src={logoUrl}
    alt="RestoStack"
    className={`h-20 w-auto object-contain ${invert ? "invert brightness-0 [filter:invert(1)]" : ""} ${className}`}
  />
);

const spark = (seed: number) =>
  Array.from({ length: 16 }).map((_, i) => ({
    x: i,
    y: 40 + Math.sin(i / 2 + seed) * 10 + Math.cos(i / 3 + seed * 2) * 8 + i * 1.2,
  }));

const revenueSeries = Array.from({ length: 7 }).map((_, i) => ({
  x: i, y: 4000 + Math.sin(i) * 1500 + i * 800,
}));

const stats = [
  { label: "Reservations Today", value: "128", d: "12.5%", seed: 1 },
  { label: "Guest Profiles", value: "2,008", d: "8.7%", seed: 2 },
  { label: "Loyalty Members", value: "1,246", d: "14.3%", seed: 3 },
  { label: "Revenue Today", value: "$8,420", d: "18.6%", seed: 4 },
];

const sideNav = [
  { i: LayoutDashboard, l: "Overview", active: true },
  { i: CalendarDays, l: "Reservations" },
  { i: Users, l: "Guests" },
  { i: Gift, l: "Loyalty" },
  { i: Megaphone, l: "Marketing" },
  { i: ShoppingBag, l: "Orders" },
  { i: BarChart3, l: "Analytics" },
  { i: FileText, l: "Reports" },
  { i: Plug, l: "Integrations" },
  { i: SettingsIcon, l: "Settings" },
];

function DashboardMock() {
  return (
    <div className="mx-auto w-full max-w-6xl rounded-3xl bg-[#0d0d0d] p-4 text-white shadow-[0_40px_120px_-30px_rgba(57,212,0,0.25),0_30px_80px_-30px_rgba(0,0,0,0.5)] ring-1 ring-white/5">
      <div className="grid grid-cols-12 gap-4">
        {/* Sidebar */}
        <aside className="col-span-3 rounded-2xl bg-[#0d0d0d] p-3">
          <div className="mb-6 flex items-center gap-2 px-2">
            <span className="font-serif text-xl font-bold text-white">RestoStack</span>
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
              {Array.from({ length: 12 }).map((_, i) => (
                <rect key={i} x="11" y="2" width="2" height="9" rx="1" fill={GREEN} transform={`rotate(${i * 30} 12 12)`} />
              ))}
              <circle cx="12" cy="12" r="2" fill={GREEN} />
            </svg>
          </div>
          <nav className="space-y-1">
            {sideNav.map(({ i: Icon, l, active }) => (
              <div key={l} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${active ? "bg-white/10 text-white" : "text-white/60"}`}>
                <Icon className="h-4 w-4" />
                <span>{l}</span>
              </div>
            ))}
          </nav>
          <div className="mt-6 rounded-xl border border-white/10 p-3 text-xs">
            <div className="flex items-center gap-2 text-white/70">
              <HelpCircle className="h-4 w-4" />Need help?
            </div>
            <div className="mt-1 font-medium" style={{ color: GREEN }}>Contact Support</div>
          </div>
        </aside>

        {/* Main */}
        <div className="col-span-9 space-y-4">
          <div className="flex items-center justify-between rounded-2xl bg-[#161616] px-5 py-3">
            <h3 className="font-serif text-xl text-white">Overview</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/80">
                <Calendar className="h-3.5 w-3.5" />May 20 – May 20, 2024<ChevronDown className="h-3 w-3" />
              </div>
              <Bell className="h-4 w-4 text-white/60" />
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-zinc-500 to-zinc-700" />
                <div className="text-xs leading-tight">
                  <div>Alex Morgan</div>
                  <div className="text-white/40">Admin</div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl bg-[#161616] p-3">
                <div className="text-[11px] text-white/50">{s.label}</div>
                <div className="mt-1 font-serif text-2xl">{s.value}</div>
                <div className="text-[10px]" style={{ color: GREEN }}>▲ {s.d} vs yesterday</div>
                <div className="mt-1 h-8">
                  <ResponsiveContainer><AreaChart data={spark(s.seed)}>
                    <defs><linearGradient id={`g${s.seed}`} x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={GREEN} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={GREEN} stopOpacity={0} />
                    </linearGradient></defs>
                    <Area dataKey="y" stroke={GREEN} strokeWidth={1.5} fill={`url(#g${s.seed})`} />
                  </AreaChart></ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-3 rounded-xl bg-[#161616] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-white/50">Revenue Overview</div>
                  <div className="mt-0.5 font-serif text-2xl">$8,420 <span className="text-xs" style={{ color: GREEN }}>▲ 18.6%</span></div>
                </div>
                <div className="rounded bg-white/5 px-2 py-1 text-[10px] text-white/70">This Week ▾</div>
              </div>
              <div className="mt-3 h-32">
                <ResponsiveContainer><RLineChart data={revenueSeries}>
                  <Line dataKey="y" stroke={GREEN} strokeWidth={2} dot={{ r: 3, fill: GREEN }} />
                </RLineChart></ResponsiveContainer>
              </div>
            </div>
            <div className="col-span-2 rounded-xl bg-[#161616] p-4">
              <div className="text-[11px] text-white/50">Top Performing Channels</div>
              <div className="mt-3 flex items-center gap-4">
                <div className="relative h-28 w-28">
                  <ResponsiveContainer><PieChart>
                    <Pie data={[{ v: 42 }, { v: 28 }, { v: 17 }, { v: 13 }]} dataKey="v" innerRadius={30} outerRadius={48} startAngle={90} endAngle={-270}>
                      {[GREEN, "#1f7a10", "#3f3f3f", "#1f1f1f"].map((c, i) => <Cell key={i} fill={c} />)}
                    </Pie>
                  </PieChart></ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <div className="font-serif text-base">$8,420</div>
                    <div className="text-[9px] text-white/40">Total Revenue</div>
                  </div>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  {[["Direct", "42%", GREEN], ["Reservations", "28%", "#1f7a10"], ["Walk-in", "17%", "#666"], ["Online Ordering", "13%", "#333"]].map(([l, v, c]) => (
                    <div key={l} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} /><span className="w-24 text-white/70">{l}</span><span className="font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-3 rounded-xl bg-[#161616] p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Upcoming Reservations</div>
                <div className="text-[11px]" style={{ color: GREEN }}>View all</div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-rose-300 to-rose-500" />
                <div className="flex-1 text-xs">
                  <div className="text-white/60">Today, May 20 • 7:30 PM</div>
                  <div>Emma Johnson</div>
                  <div className="mt-0.5 text-white/50">🪑 Table 12 &nbsp; 👥 4 People</div>
                </div>
                <span className="rounded-md px-2 py-1 text-[10px] font-medium text-black" style={{ background: GREEN }}>Upcoming</span>
              </div>
            </div>
            <div className="col-span-2 rounded-xl bg-[#161616] p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Automated Campaigns</div>
                <span className="rounded-md px-2 py-0.5 text-[10px] font-medium text-black" style={{ background: GREEN }}>Active</span>
              </div>
              <div className="mt-3 text-xs">
                <div className="font-medium">Winback Campaign – 45 Days</div>
                <div className="text-white/50">Sent to 823 guests</div>
              </div>
              <div className="mt-3 flex gap-6 text-xs">
                <div><div className="text-white/50 text-[10px]">Open Rate</div><div className="font-serif text-lg">32%</div></div>
                <div><div className="text-white/50 text-[10px]">Bookings</div><div className="font-serif text-lg">48</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const features = [
  { i: Calendar, l: "Reservations", d: "Powerful booking engine that reduces no-shows and maximizes table turnover." },
  { i: UserCircle2, l: "Guest Profiles", d: "Unified guest data that captures preferences, history, and lifetime value." },
  { i: Award, l: "Loyalty Rewards", d: "Reward your best guests and turn first-time visitors into loyal regulars." },
  { i: Send, l: "Automated Campaigns", d: "Send the right message at the right time and bring guests back automatically." },
  { i: LineChart, l: "Analytics & Insights", d: "Real-time insights that help you make smarter decisions and increase revenue." },
  { i: Store, l: "Multi-Location", d: "Manage multiple locations seamlessly from one centralized platform." },
];

const checklist = [
  "Increase repeat visits", "Improve guest retention", "Automate marketing",
  "Centralize customer data", "Operate multi-location groups more efficiently", "Turn guest behavior into measurable revenue",
];

const productModules = [
  { i: Calendar, l: "Reservations", d: "Booking engine that reduces no-shows and maximizes table turnover with smart deposits, waitlists, and SMS confirmations." },
  { i: ClipboardList, l: "Host Stand", d: "A live floor plan, waitlist, and reservation queue designed for the chaos of a Friday night service." },
  { i: Utensils, l: "Server Pad", d: "Mobile order pad with upsells, course timing, and instant ticket fire to the kitchen." },
  { i: UserCircle2, l: "Guest Profiles", d: "Unified guest CRM with preferences, allergies, lifetime spend, and visit history across every location." },
  { i: Award, l: "Loyalty Rewards", d: "Points, tiers, and referrals built in — no third-party app required, no per-guest fees." },
  { i: Send, l: "Marketing Automation", d: "Win back lapsed guests, send birthday offers, and trigger campaigns based on real visit behavior." },
  { i: ShoppingBag, l: "Orders & POS", d: "Take dine-in, takeaway, and online orders through one ticket stream with kitchen routing." },
  { i: LineChart, l: "Analytics & Insights", d: "Cohorts, channel mix, menu performance, and labor — surfaced as decisions, not dashboards." },
  { i: Network, l: "Integrations", d: "Connect Stripe, Twilio, Google, Square, and your accounting stack with prebuilt connectors." },
];

const useCases = [
  { i: Wine, l: "Fine Dining", d: "Deposit-backed reservations, guest preferences at the table, and post-visit follow-ups that build regulars.", points: ["Deposit-gated bookings", "Allergy & preference tracking", "VIP & dietary tags", "Tasting menu workflows"] },
  { i: Utensils, l: "Casual Restaurants", d: "Speed up table turns, automate review requests, and turn one-time visitors into a loyalty base.", points: ["Waitlist + SMS pager", "Loyalty without an app", "Review automation", "Daily flash reports"] },
  { i: Coffee, l: "Cafés & Bakeries", d: "Run counter service, pickup orders, and morning rushes with one ticket stream and one guest profile.", points: ["Counter + online orders", "Mobile pickup", "Stamp-card loyalty", "Recurring offers"] },
  { i: Pizza, l: "Pizzerias & Quick Service", d: "Online ordering, delivery routing, and repeat-customer marketing in a single connected stack.", points: ["Online ordering", "Driver dispatch", "SMS win-backs", "Menu pricing by location"] },
  { i: Building2, l: "Multi-Location Groups", d: "Roll up performance, compare sites, and push menu, pricing, or campaign changes from one console.", points: ["Group-level analytics", "Central menu management", "Per-site permissions", "Cross-location guest data"] },
  { i: Truck, l: "Ghost Kitchens & Pop-ups", d: "Spin up a brand fast, take orders online, and migrate guests when you go brick-and-mortar.", points: ["Multi-brand under one roof", "Fast launch", "Portable guest CRM", "Campaign-ready"] },
];

const tiers = [
  { name: "Starter", price: "$129", cadence: "/ location / month", blurb: "Everything an independent restaurant needs to run service.", features: ["Reservations & waitlist", "Host stand & floor plan", "Guest profiles & CRM", "Loyalty (points + stamps)", "Email & SMS marketing (1k/mo)", "Daily flash reports"], cta: "Join early access", highlight: false },
  { name: "Growth", price: "$289", cadence: "/ location / month", blurb: "For restaurants ready to compound revenue with automation.", features: ["Everything in Starter", "Server pad & order routing", "Marketing automation flows", "Email & SMS (10k/mo)", "Review management", "Advanced analytics & cohorts", "Multi-location reporting"], cta: "Join early access", highlight: true, badge: "Most popular" },
  { name: "Group", price: "Custom", cadence: "5+ locations", blurb: "For hospitality groups and franchised concepts.", features: ["Everything in Growth", "Central menu management", "Per-site permissions & roles", "Dedicated success manager", "SSO & audit logs", "Custom integrations & API", "SLA & priority support"], cta: "Talk to sales", highlight: false },
];

const values = [
  { i: Heart, l: "Operators first", d: "Every feature is shaped by real restaurateurs running real services. No ivory-tower SaaS." },
  { i: Zap, l: "Speed of service", d: "If it slows down a Friday night, it doesn't ship. Performance is a feature, not a polish item." },
  { i: Shield, l: "Own your data", d: "Your guest list belongs to you. Export anytime, no lock-in, no marketplace selling your customers back to you." },
];

function ComingSoon() {
  const [form, setForm] = useState({ name: "", email: "", restaurant: "", phone: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-white pb-20 text-black lg:pb-0">
      {/* Navbar */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 sm:py-6">
        <Logo className="h-12 sm:h-20" />
        <nav className="hidden items-center gap-10 text-sm text-zinc-700 md:flex">
          {[
            { to: "#product", l: "Product" },
            { to: "#use-cases", l: "Use Cases" },
            { to: "#about", l: "About Us" },
          ].map((n) => (
            <a key={n.to} href={n.to} className="transition hover:text-black">{n.l}</a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <DemoRequestDialog
            trigger={
              <button
                type="button"
                className="hidden sm:inline-flex rounded-full px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
                style={{ background: GREEN }}
              >
                Request a demo
              </button>
            }
          />
          <a
            href="#early-access"
            className="rounded-full border-2 px-3 py-1.5 text-xs font-medium transition hover:bg-[#39D400] hover:text-black sm:px-5 sm:py-2 sm:text-sm"
            style={{ borderColor: GREEN, color: "#1a1a1a" }}
          >
            Get Early Access
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-5 pt-4 pb-10 text-center sm:px-6 sm:pt-8 sm:pb-12">
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wider" style={{ background: "rgba(57,212,0,0.12)", color: "#1a7a00" }}>
          <Sparkles className="h-3 w-3" />COMING SOON
        </span>
        <h1 className="mt-5 font-serif text-[2.5rem] leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
          <strong className="font-bold">The OS for Restaurants</strong><br />
          is Coming<span style={{ color: GREEN }}>.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base font-semibold text-zinc-700 sm:text-lg">
          The ultimate Restaurant Operating System
        </p>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500 sm:text-base">
          RestoStack connects reservations, guest profiles, loyalty, server ordering, and marketing automation into one intelligent platform — helping restaurants turn guest behavior into repeat revenue.
        </p>
        {/* Mobile primary CTA */}
        <div className="mt-7 flex flex-col items-center gap-2 sm:hidden">
          <DemoRequestDialog
            trigger={
              <button
                type="button"
                className="inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold text-black transition hover:opacity-90"
                style={{ background: GREEN }}
              >
                Request a demo <ArrowRight className="h-4 w-4" />
              </button>
            }
          />
          <a
            href="#early-access"
            className="inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-full border-2 px-6 py-3 text-sm font-semibold transition"
            style={{ borderColor: GREEN, color: "#1a1a1a" }}
          >
            Join the Waiting List
          </a>
        </div>
      </section>

      {/* Dashboard — desktop/tablet only */}
      <section className="hidden px-6 pb-20 sm:block"><DashboardMock /></section>

      {/* Mobile preview — simplified card stack */}
      <section className="px-5 pb-12 sm:hidden">
        <div className="mx-auto max-w-md rounded-2xl bg-[#0d0d0d] p-4 text-white shadow-[0_20px_60px_-20px_rgba(57,212,0,0.3)] ring-1 ring-white/5">
          <div className="flex items-center justify-between">
            <div className="font-serif text-lg">Overview</div>
            <span className="rounded-md bg-white/5 px-2 py-1 text-[10px] text-white/70">Today</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl bg-[#161616] p-3">
                <div className="text-[10px] text-white/50">{s.label}</div>
                <div className="mt-1 font-serif text-xl">{s.value}</div>
                <div className="text-[10px]" style={{ color: GREEN }}>▲ {s.d}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl bg-[#161616] p-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-white/50">Revenue This Week</span>
              <span style={{ color: GREEN }}>▲ 18.6%</span>
            </div>
            <div className="mt-1 font-serif text-2xl">$8,420</div>
            <div className="mt-2 h-16">
              <ResponsiveContainer><RLineChart data={revenueSeries}>
                <Line dataKey="y" stroke={GREEN} strokeWidth={2} dot={{ r: 2, fill: GREEN }} />
              </RLineChart></ResponsiveContainer>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-[#161616] p-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-rose-300 to-rose-500" />
            <div className="flex-1 text-xs">
              <div className="text-white/60">Today • 7:30 PM</div>
              <div>Emma Johnson · Table 12</div>
            </div>
            <span className="rounded-md px-2 py-1 text-[10px] font-medium text-black" style={{ background: GREEN }}>4 ppl</span>
          </div>
        </div>
      </section>

      {/* CTA under screenshot */}
      <section className="mx-auto hidden max-w-4xl px-6 pb-20 text-center sm:block">
        <h3 className="font-serif text-3xl md:text-4xl">
          Ready to run your restaurant on <span style={{ color: GREEN }}>one</span> platform?
        </h3>
        <p className="mx-auto mt-3 max-w-xl text-base text-zinc-500">
          Get early access and be among the first to experience the operating system built specifically for restaurants.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <DemoRequestDialog
            trigger={
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-semibold text-black transition hover:opacity-90"
                style={{ background: GREEN }}
              >
                Request a demo <ArrowRight className="h-4 w-4" />
              </button>
            }
          />
          <a
            href="#early-access"
            className="inline-flex items-center gap-2 rounded-full border-2 px-8 py-3 text-sm font-semibold transition hover:bg-[#39D400] hover:text-black"
            style={{ borderColor: GREEN, color: "#1a1a1a" }}
          >
            Join the Waiting List
          </a>
        </div>
      </section>




      {/* Trust */}
      <section className="mx-auto max-w-6xl border-t px-5 py-12 text-center sm:px-6 sm:py-20">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 sm:text-sm">Trusted by restaurants who care about their guests</p>
        <div className="mt-8 overflow-hidden sm:mt-12">

          <div className="animate-marquee flex w-max items-center gap-14">
            {[
              { name: "Jukebox", src: jukeboxLogo },
              { name: "Industria", src: industriaLogo },
              { name: "Bistro Noir", src: bistroNoirLogo },
              { name: "The Copper Pot", src: copperPotLogo },
              { name: "Saffron & Sage", src: saffronSageLogo },
              { name: "Fireside Grill", src: firesideLogo },
              { name: "Harbor Fish", src: harborFishLogo },
              { name: "Terra Verde", src: terraVerdeLogo },
              { name: "Sweetgreen", src: "https://logo.clearbit.com/sweetgreen.com" },
              { name: "Shake Shack", src: "https://logo.clearbit.com/shakeshack.com" },
              { name: "Chipotle", src: "https://logo.clearbit.com/chipotle.com" },
              { name: "Cava", src: "https://logo.clearbit.com/cava.com" },
            ].map((l, i) => (
              <div key={`a-${i}`} className="flex h-16 w-36 shrink-0 items-center justify-center">
                <img
                  src={l.src}
                  alt={`${l.name} logo`}
                  loading="lazy"
                  className="h-full w-full object-contain opacity-80 grayscale transition hover:opacity-100 hover:grayscale-0"
                />
              </div>
            ))}
            {[
              { name: "Jukebox", src: jukeboxLogo },
              { name: "Industria", src: industriaLogo },
              { name: "Bistro Noir", src: bistroNoirLogo },
              { name: "The Copper Pot", src: copperPotLogo },
              { name: "Saffron & Sage", src: saffronSageLogo },
              { name: "Fireside Grill", src: firesideLogo },
              { name: "Harbor Fish", src: harborFishLogo },
              { name: "Terra Verde", src: terraVerdeLogo },
              { name: "Sweetgreen", src: "https://logo.clearbit.com/sweetgreen.com" },
              { name: "Shake Shack", src: "https://logo.clearbit.com/shakeshack.com" },
              { name: "Chipotle", src: "https://logo.clearbit.com/chipotle.com" },
              { name: "Cava", src: "https://logo.clearbit.com/cava.com" },
            ].map((l, i) => (
              <div key={`b-${i}`} className="flex h-16 w-36 shrink-0 items-center justify-center">
                <img
                  src={l.src}
                  alt={`${l.name} logo`}
                  loading="lazy"
                  className="h-full w-full object-contain opacity-80 grayscale transition hover:opacity-100 hover:grayscale-0"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl border-t px-5 py-12 sm:px-6 sm:py-20">
        <h2 className="text-center font-serif text-3xl sm:text-4xl md:text-5xl">
          One platform. All the tools you need to <span style={{ color: GREEN }}>grow.</span>
        </h2>
        <div className="mt-10 grid grid-cols-2 gap-px bg-zinc-100 sm:mt-14 sm:grid-cols-2 lg:grid-cols-6">

          {features.map(({ i: Icon, l, d }) => (
            <div key={l} className="bg-white p-6 text-center transition hover:bg-zinc-50">
              <div className="mx-auto flex h-12 w-12 items-center justify-center">
                <Icon className="h-9 w-9" strokeWidth={1.5} style={{ color: GREEN }} />
              </div>
              <div className="mt-4 font-semibold">{l}</div>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRODUCT */}
      <section id="product" className="mx-auto max-w-7xl scroll-mt-24 border-t px-5 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wider" style={{ background: "rgba(57,212,0,0.12)", color: "#1a7a00" }}>
            <Sparkles className="h-3 w-3" />PRODUCT
          </span>
          <h2 className="mt-4 font-serif text-3xl sm:text-4xl md:text-5xl">
            Everything your restaurant runs on, <span style={{ color: GREEN }}>under one roof.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500 sm:text-base">
            RestoStack replaces the patchwork of reservation, POS, CRM, loyalty, and marketing tools with one connected operating system.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-px bg-zinc-100 sm:grid-cols-2 lg:grid-cols-3">
          {productModules.map(({ i: Icon, l, d }) => (
            <div key={l} className="bg-white p-6 transition hover:bg-zinc-50 sm:p-7">
              <Icon className="h-7 w-7" strokeWidth={1.5} style={{ color: GREEN }} />
              <div className="mt-4 font-serif text-xl">{l}</div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* USE CASES */}
      <section id="use-cases" className="mx-auto max-w-7xl scroll-mt-24 border-t px-5 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wider" style={{ background: "rgba(57,212,0,0.12)", color: "#1a7a00" }}>
            <Sparkles className="h-3 w-3" />USE CASES
          </span>
          <h2 className="mt-4 font-serif text-3xl sm:text-4xl md:text-5xl">
            Built for the way <span style={{ color: GREEN }}>you</span> serve.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500 sm:text-base">
            From two-top tasting menus to multi-brand ghost kitchens, RestoStack flexes to match how your team actually runs service.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
          {useCases.map(({ i: Icon, l, d, points }) => (
            <article key={l} className="rounded-2xl border border-zinc-200 p-6 transition hover:border-zinc-300 hover:shadow-sm sm:p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "rgba(57,212,0,0.12)" }}>
                <Icon className="h-5 w-5" strokeWidth={1.5} style={{ color: GREEN }} />
              </div>
              <h3 className="mt-4 font-serif text-2xl">{l}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{d}</p>
              <ul className="mt-4 grid grid-cols-2 gap-2 text-xs text-zinc-700">
                {points.map((p) => (
                  <li key={p} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: GREEN }} />
                    {p}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* PRICING — hidden for now */}
      {false && (
      <section id="pricing" className="mx-auto max-w-7xl scroll-mt-24 border-t px-5 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wider" style={{ background: "rgba(57,212,0,0.12)", color: "#1a7a00" }}>
            <Sparkles className="h-3 w-3" />PRICING
          </span>
          <h2 className="mt-4 font-serif text-3xl sm:text-4xl md:text-5xl">
            One price per location. <span style={{ color: GREEN }}>No per-cover fees.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500 sm:text-base">
            Replace six tools with one bill. Founding restaurants lock in early access pricing for life.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`relative flex flex-col rounded-3xl border p-6 sm:p-8 ${
                t.highlight ? "border-transparent bg-[#0d0d0d] text-white shadow-xl" : "border-zinc-200 bg-white"
              }`}
            >
              {t.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-black" style={{ background: GREEN }}>
                  {t.badge}
                </span>
              )}
              <div className="font-serif text-2xl">{t.name}</div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-serif text-5xl">{t.price}</span>
                <span className={`text-xs ${t.highlight ? "text-white/60" : "text-zinc-500"}`}>{t.cadence}</span>
              </div>
              <p className={`mt-3 text-sm ${t.highlight ? "text-white/70" : "text-zinc-500"}`}>{t.blurb}</p>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: GREEN }} />
                    <span className={t.highlight ? "text-white/90" : "text-zinc-700"}>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href="#early-access"
                className={`mt-8 flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition ${
                  t.highlight ? "text-black hover:opacity-90" : "border-2 hover:bg-[#39D400] hover:text-black"
                }`}
                style={t.highlight ? { background: GREEN } : { borderColor: GREEN, color: "#1a1a1a" }}
              >
                {t.cta} <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* ABOUT */}
      <section id="about" className="mx-auto max-w-7xl scroll-mt-24 border-t px-5 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wider" style={{ background: "rgba(57,212,0,0.12)", color: "#1a7a00" }}>
            <Sparkles className="h-3 w-3" />ABOUT US
          </span>
          <h2 className="mt-4 font-serif text-3xl sm:text-4xl md:text-5xl">
            Built by restaurant people, <span style={{ color: GREEN }}>for restaurant people.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500 sm:text-base">
            RestoStack exists because the people behind the pass deserve software that respects their pace, their margins, and their guests.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-px bg-zinc-100 sm:grid-cols-3">
          {values.map(({ i: Icon, l, d }) => (
            <div key={l} className="bg-white p-6 sm:p-8">
              <Icon className="h-7 w-7" strokeWidth={1.5} style={{ color: GREEN }} />
              <div className="mt-4 font-serif text-xl">{l}</div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{d}</p>
            </div>
          ))}
        </div>
      </section>


      {/* Early access */}
      <section id="early-access" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-20">
        <div className="rounded-3xl bg-[#f1f4ed] p-5 sm:p-8 md:p-14">
          <div className="grid items-center gap-8 md:grid-cols-[1fr_1.4fr] md:gap-10">
            <div className="text-center md:text-left">
              <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl">Join the waiting list</h3>
              <p className="mx-auto mt-3 max-w-sm text-sm text-zinc-600 md:mx-0">
                Be the first to see how RestoStack helps restaurants replace disconnected tools with one connected system.
              </p>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (submitting || submitted) return;
                setError(null);
                setSubmitting(true);
                const { error: insertError } = await supabase
                  .from("waitlist_signups")
                  .insert({
                    name: form.name.trim(),
                    email: form.email.trim(),
                    restaurant: form.restaurant.trim(),
                    phone: form.phone.trim(),
                  });
                setSubmitting(false);
                if (insertError) {
                  setError("Something went wrong. Please check your details and try again.");
                  return;
                }
                setSubmitted(true);
              }}
              className="space-y-4 md:space-y-5"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { k: "name", l: "Your Name", p: "Jane Doe", type: "text", autoComplete: "name" },
                  { k: "email", l: "Email Address", p: "you@restaurant.com", type: "email", autoComplete: "email" },
                  { k: "restaurant", l: "Restaurant", p: "Your restaurant name", type: "text", autoComplete: "organization" },
                  { k: "phone", l: "Phone Number", p: "(555) 123-4567", type: "tel", autoComplete: "tel" },
                ].map((f) => (
                  <label key={f.k} className="block rounded-xl bg-white p-3 ring-1 ring-zinc-200">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{f.l}</span>
                    <input
                      type={f.type}
                      required
                      maxLength={f.k === "email" ? 255 : f.k === "restaurant" ? 160 : f.k === "phone" ? 40 : 120}
                      autoComplete={f.autoComplete}
                      placeholder={f.p}
                      value={(form as any)[f.k]}
                      onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                      className="mt-1 min-h-[44px] w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
                    />
                  </label>
                ))}
              </div>
              {error && <p className="text-center text-xs text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={submitting || submitted}
                className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-70 md:min-h-0"
                style={{ background: GREEN }}
              >
                {submitted ? "You're on the list ✓" : submitting ? "Joining…" : <>Join the Waiting List <ArrowRight className="h-4 w-4" /></>}
              </button>
              <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-500 sm:text-xs">
                <Lock className="h-3 w-3 flex-shrink-0" />Built for independent restaurants, hospitality groups, and multi-location brands.
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Vision */}
      <section className="relative mx-auto my-6 max-w-7xl overflow-hidden bg-gradient-to-br from-black via-[#0a0f08] to-black p-6 sm:rounded-3xl sm:p-10 md:p-16">
        <div className="absolute -right-20 -bottom-20 h-96 w-96 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(57,212,0,0.2), transparent 70%)" }} />
        <div className="relative grid gap-10 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: GREEN }}>Our vision is simple:</div>
            <h3 className="mt-4 font-serif text-3xl leading-tight text-white md:text-4xl">
              Every modern restaurant should run on one operating system.
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {checklist.map((c) => (
              <div key={c} className="flex items-start gap-2 text-sm text-white/90">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: GREEN }} />
                <span>{c}</span>
              </div>
            ))}
          </div>
        </div>
        <svg className="pointer-events-none absolute -right-10 bottom-6 opacity-30" width="200" height="200" viewBox="0 0 24 24" fill="none">
          {Array.from({ length: 16 }).map((_, i) => (
            <rect key={i} x="11.5" y="1" width="1" height="10" fill={GREEN} transform={`rotate(${i * 22.5} 12 12)`} />
          ))}
          <circle cx="12" cy="12" r="1.5" fill={GREEN} />
        </svg>
      </section>

      {/* Footer */}
      <footer className="mx-auto mt-10 flex max-w-7xl flex-col items-center justify-between gap-4 border-t px-6 py-8 text-sm text-zinc-500 md:flex-row">
        <div className="flex items-center gap-4">
          <Logo />
          <span className="hidden border-l pl-4 md:inline">The OS for Restaurants.</span>
        </div>
        <div>© 2026 RestoStack. All rights reserved.</div>
        <div className="flex items-center gap-4">
          <a href="#"><Linkedin className="h-4 w-4" /></a>
          <a href="#"><Instagram className="h-4 w-4" /></a>
          <a href="#"><Mail className="h-4 w-4" /></a>
        </div>
      </footer>

      {/* Sticky mobile booking CTA */}
      {!submitted && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <a
            href="#early-access"
            className="flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-black shadow-lg transition active:scale-[0.98]"
            style={{ background: GREEN }}
          >
            Join the Waiting List <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      )}
    </div>
  );
}
