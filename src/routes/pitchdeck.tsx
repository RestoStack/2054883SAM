import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  LayoutGrid,
  Globe2,
  TrendingUp,
  Wallet,
  Swords,
  Users,
  Rocket,
  Telescope,
} from "lucide-react";

export const Route = createFileRoute("/pitchdeck")({
  head: () => ({
    meta: [
      { title: "Pitch Deck — RestoStacks" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Internal pitch deck." },
    ],
  }),
  component: PitchDeck,
});

type Slide = {
  kicker: string;
  title: string;
  render: () => ReactNode;
  Icon: LucideIcon;
};
const amber = "text-amber-400";
const amberBg = "bg-amber-400";

function Stat({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div className="flex flex-col">
      <span className={`font-bold leading-none tracking-tight ${amber} text-[clamp(4rem,12vw,11rem)]`}>
        {value}
      </span>
      <span className="mt-4 text-lg md:text-2xl text-white/80">{label}</span>
      {sub && <span className="mt-1 text-sm md:text-base text-white/40">{sub}</span>}
    </div>
  );
}

function SlideShell({
  kicker,
  title,
  Icon,
  children,
}: {
  kicker: string;
  title: string;
  Icon: typeof AlertTriangle;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full w-full flex-col px-8 py-10 md:px-20 md:py-16">
      <div className="flex items-center gap-3 text-xs md:text-sm uppercase tracking-[0.25em] text-white/40">
        <Icon className={`size-4 ${amber}`} />
        <span>{kicker}</span>
      </div>
      <h2 className="mt-6 text-4xl md:text-6xl font-semibold tracking-tight text-white max-w-4xl">
        {title}
      </h2>
      <div className="mt-10 md:mt-14 flex-1 min-h-0">{children}</div>
    </div>
  );
}

const slides: Slide[] = [
  {
    kicker: "01 — Problem",
    title: "Restaurants run on 7 disconnected tools.",
    Icon: AlertTriangle,
    render: () => (
      <div className="grid h-full grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <Stat value="7+" label="Tools per restaurant" sub="POS, reservations, CRM, loyalty, marketing, payroll, analytics" />
        <div className="grid grid-cols-3 gap-3">
          {["POS", "Resa", "CRM", "Loyalty", "Email", "SMS", "Payroll", "Reports", "Menu"].map((t) => (
            <div key={t} className="aspect-square rounded-lg border border-white/10 bg-white/[0.02] flex items-center justify-center text-xs text-white/50">
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    kicker: "02 — Solution",
    title: "One stack. Front of house to back office.",
    Icon: Sparkles,
    render: () => (
      <div className="grid h-full grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          <span className={`text-[clamp(5rem,14vw,13rem)] font-bold leading-none ${amber}`}>1</span>
          <p className="mt-6 text-xl md:text-2xl text-white/70 max-w-md">
            A single platform replacing the seven tools restaurants stitch together today.
          </p>
        </div>
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl bg-amber-400/10 blur-3xl" />
          <div className="relative rounded-2xl border border-amber-400/30 bg-white/[0.03] p-8">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {["Reservations", "Host Stand", "POS", "Guest CRM", "Loyalty", "Marketing", "Payroll", "Analytics"].map((t) => (
                <div key={t} className="flex items-center gap-2 text-white/80">
                  <span className={`size-1.5 rounded-full ${amberBg}`} /> {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    kicker: "03 — Product",
    title: "Built for the floor, not the boardroom.",
    Icon: LayoutGrid,
    render: () => (
      <div className="grid h-full grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { n: "12s", l: "Average order entry" },
          { n: "1", l: "Tap to seat a guest" },
          { n: "0", l: "Per-cover fees" },
          { n: "24/7", l: "Offline-ready" },
        ].map((s) => (
          <div key={s.l} className="rounded-xl border border-white/10 bg-white/[0.02] p-6 flex flex-col justify-between">
            <span className={`text-4xl md:text-6xl font-bold ${amber}`}>{s.n}</span>
            <span className="text-sm text-white/60 mt-6">{s.l}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    kicker: "04 — Market",
    title: "A $42B market still on paper and patchwork.",
    Icon: Globe2,
    render: () => (
      <div className="grid h-full grid-cols-1 md:grid-cols-3 gap-8 items-center">
        <Stat value="$42B" label="TAM — global restaurant tech" />
        <Stat value="$11B" label="SAM — independents & groups" />
        <Stat value="$1.2B" label="SOM — 5yr target" />
      </div>
    ),
  },
  {
    kicker: "05 — Traction",
    title: "Growth without a sales team. Yet.",
    Icon: TrendingUp,
    render: () => (
      <div className="grid h-full grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <Stat value="312" label="Restaurants on the waitlist" sub="Past 90 days" />
        <div className="flex h-48 items-end gap-3">
          {[8, 14, 22, 31, 47, 68, 95, 142, 201, 268, 312].map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-amber-400/80" style={{ height: `${(h / 312) * 100}%` }} />
          ))}
        </div>
      </div>
    ),
  },
  {
    kicker: "06 — Business model",
    title: "Flat SaaS. No per-cover tax.",
    Icon: Wallet,
    render: () => (
      <div className="grid h-full grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="rounded-xl border border-white/10 p-8">
          <div className={`text-5xl font-bold ${amber}`}>$129</div>
          <div className="mt-2 text-sm text-white/60">/ month — Starter</div>
        </div>
        <div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-8">
          <div className={`text-6xl font-bold ${amber}`}>$289</div>
          <div className="mt-2 text-sm text-white/80">/ month — Growth</div>
        </div>
        <div className="rounded-xl border border-white/10 p-8">
          <div className={`text-5xl font-bold ${amber}`}>Custom</div>
          <div className="mt-2 text-sm text-white/60">Group & Enterprise</div>
        </div>
      </div>
    ),
  },
  {
    kicker: "07 — Competition",
    title: "Legacy stacks bill per cover. We don't.",
    Icon: Swords,
    render: () => (
      <div className="grid h-full grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          <div className={`text-7xl md:text-8xl font-bold ${amber}`}>$0</div>
          <p className="mt-4 text-xl text-white/70 max-w-sm">per cover, per reservation, per guest profile.</p>
        </div>
        <div className="space-y-3 text-sm">
          {[
            { n: "Toast", v: "$0.99 / cover" },
            { n: "OpenTable", v: "$1.50 / seated" },
            { n: "Resy", v: "$200+ /mo + fees" },
            { n: "RestoStacks", v: "Flat. Always.", highlight: true },
          ].map((c) => (
            <div
              key={c.n}
              className={`flex justify-between rounded-lg border px-4 py-3 ${c.highlight ? "border-amber-400/50 bg-amber-400/5" : "border-white/10"}`}
            >
              <span className="text-white/80">{c.n}</span>
              <span className={c.highlight ? amber : "text-white/50"}>{c.v}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    kicker: "08 — Team",
    title: "Operators who shipped at scale.",
    Icon: Users,
    render: () => (
      <div className="grid h-full grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {[
          { n: "Founder / CEO", b: "10yrs hospitality ops" },
          { n: "Founder / CTO", b: "ex-Stripe, ex-Square" },
          { n: "Head of Design", b: "ex-Linear, ex-Figma" },
        ].map((p) => (
          <div key={p.n} className="rounded-xl border border-white/10 p-8">
            <div className={`size-14 rounded-full ${amberBg}/20 border border-amber-400/40`} />
            <div className="mt-6 text-lg font-semibold text-white">{p.n}</div>
            <div className="mt-1 text-sm text-white/50">{p.b}</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    kicker: "09 — Ask",
    title: "Raising to put 1,000 restaurants on one stack.",
    Icon: Rocket,
    render: () => (
      <div className="grid h-full grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <Stat value="$4M" label="Seed round" sub="18 months runway" />
        <div className="space-y-4">
          {[
            { p: "50%", l: "Engineering" },
            { p: "30%", l: "Go-to-market" },
            { p: "20%", l: "Ops & support" },
          ].map((a) => (
            <div key={a.l}>
              <div className="flex justify-between text-sm text-white/70">
                <span>{a.l}</span>
                <span className={amber}>{a.p}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-white/5 overflow-hidden">
                <div className={`h-full ${amberBg}`} style={{ width: a.p }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    kicker: "10 — Vision",
    title: "Every restaurant. One stack. Zero friction.",
    Icon: Telescope,
    render: () => (
      <div className="flex h-full items-center justify-center text-center">
        <div>
          <div className={`text-[clamp(5rem,16vw,15rem)] font-bold leading-none ${amber}`}>∞</div>
          <p className="mt-8 text-xl md:text-2xl text-white/70 max-w-2xl mx-auto">
            The operating system for hospitality — from a 12-seat bistro to a 200-location group.
          </p>
        </div>
      </div>
    ),
  },
];

function PitchDeck() {
  const [i, setI] = useState(0);
  const next = useCallback(() => setI((v) => Math.min(v + 1, slides.length - 1)), []);
  const prev = useCallback(() => setI((v) => Math.max(v - 1, 0)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  const s = slides[i];

  return (
    <div className="fixed inset-0 bg-[#0F0F0F] text-white font-sans flex flex-col">
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <SlideShell kicker={s.kicker} title={s.title} Icon={s.Icon}>
          {s.render()}
        </SlideShell>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-white/10 px-6 py-4">
        <div className="text-xs text-white/40 tabular-nums">
          {String(i + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </div>
        <div className="flex-1 mx-6 flex gap-1">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              aria-label={`Slide ${idx + 1}`}
              className={`h-1 flex-1 rounded-full transition ${idx === i ? amberBg : "bg-white/10 hover:bg-white/20"}`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={prev}
            disabled={i === 0}
            className="size-9 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={next}
            disabled={i === slides.length - 1}
            className="size-9 rounded-full border border-amber-400/40 bg-amber-400/10 flex items-center justify-center hover:bg-amber-400/20 disabled:opacity-30"
          >
            <ChevronRight className={`size-4 ${amber}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
