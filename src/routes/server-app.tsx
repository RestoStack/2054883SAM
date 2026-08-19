import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  meFn,
  sendOrderFn,
  logoutFn,
} from "@/lib/pos.functions";
import { LogOut } from "lucide-react";
import { isServerPadEnabled } from "@/lib/ship-mode";

export const Route = createFileRoute("/server-app")({
  head: () => ({
    meta: [
      { title: "Server Pad — RestoStack" },
      { name: "description", content: "Mobile-first order pad with smart upsells" },
    ],
  }),
  beforeLoad: async () => {
    if (!isServerPadEnabled()) {
      throw redirect({ to: "/host-stand" });
    }
    const me = await meFn();
    if (!me) throw redirect({ to: "/server-login" });
    return { me };
  },
  component: ServerAppPage,
});


import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus, Minus, Trash2, Search, Sparkles, Send, ChevronLeft, ChevronRight,
  Coffee, Pizza, Beef, Salad, IceCream, Wine,
  StickyNote, User, AlertTriangle, CheckCircle2, ClipboardList,
} from "lucide-react";

// ---------- Data (menu + combos shared with Product Analytics) ----------
type Category = "Starters" | "Mains" | "Pizza" | "Pasta" | "Steak" | "Dessert" | "Drinks";
type MenuItem = {
  id: string;
  name: string;
  price: number;
  category: Category;
  description: string;
  pairsWith: string; // id of menu item
};

const MENU: MenuItem[] = [
  { id: "m1",  name: "Caesar Salad",     price: 14, category: "Starters", description: "Crisp romaine, shaved parmesan, anchovy dressing, garlic croutons.", pairsWith: "m5" },
  { id: "m2",  name: "Wings 10pc",       price: 16, category: "Starters", description: "Slow-smoked then flash-fried, tossed in house buffalo glaze.",       pairsWith: "m14" },
  { id: "m3",  name: "Bruschetta",       price: 11, category: "Starters", description: "Toasted sourdough, vine tomato, basil, aged balsamic.",              pairsWith: "m13" },
  { id: "m4",  name: "Smash Double",     price: 19, category: "Mains",    description: "Two seared beef patties, cheddar, pickles, secret sauce.",           pairsWith: "m16" },
  { id: "m5",  name: "Grilled Salmon",   price: 28, category: "Mains",    description: "Atlantic salmon, lemon-dill butter, seasonal greens.",               pairsWith: "m12" },
  { id: "m6",  name: "Margherita Pizza", price: 17, category: "Pizza",    description: "San Marzano tomato, fior di latte, fresh basil, olive oil.",         pairsWith: "m13" },
  { id: "m7",  name: "Pepperoni Pizza",  price: 19, category: "Pizza",    description: "Spicy cured pepperoni, mozzarella, oregano, hot honey drizzle.",     pairsWith: "m13" },
  { id: "m8",  name: "Carbonara",        price: 21, category: "Pasta",    description: "Guanciale, egg yolk, pecorino, cracked black pepper.",               pairsWith: "m11" },
  { id: "m9",  name: "Truffle Pasta",    price: 26, category: "Pasta",    description: "Hand-cut tagliatelle, black truffle cream, parmesan.",               pairsWith: "m13" },
  { id: "m10", name: "Ribeye 12oz",      price: 42, category: "Steak",    description: "Dry-aged 28 days, herb butter, charred shallot.",                    pairsWith: "m13" },
  { id: "m11", name: "Tiramisu",         price: 10, category: "Dessert",  description: "Espresso-soaked ladyfingers, mascarpone cream, cocoa dust.",         pairsWith: "m13" },
  { id: "m12", name: "Crème Brûlée",     price: 11, category: "Dessert",  description: "Vanilla bean custard, torched sugar crust.",                         pairsWith: "m13" },
  { id: "m13", name: "House Red (glass)",price: 12, category: "Drinks",   description: "Medium-bodied blend, dark fruit and soft tannins.",                  pairsWith: "m10" },
  { id: "m14", name: "Local IPA",        price: 8,  category: "Drinks",   description: "Hazy, citrus-forward, brewed three blocks away.",                    pairsWith: "m2"  },
  { id: "m15", name: "Lemonade",         price: 6,  category: "Drinks",   description: "Fresh-squeezed lemon, cane sugar, sparkling water.",                 pairsWith: "m1"  },
  { id: "m16", name: "Truffle Fries",    price: 9,  category: "Starters", description: "Hand-cut, truffle oil, parmesan, chive.",                            pairsWith: "m4"  },
];

// Course progression: Appetizer → Main → Dessert → Drink
const COURSE_RANK: Record<Category, number> = {
  Starters: 1,
  Mains: 2, Pizza: 2, Pasta: 2, Steak: 2,
  Dessert: 3,
  Drinks: 4,
};
const COURSE_LABEL = ["", "Appetizer", "Main", "Dessert", "Drink"];

// Combos from Product Analytics → drives upsells
const COMBOS: { trigger: string; suggest: string; rate: number; badge: "Hot" | "Rising" | "Classic" }[] = [
  { trigger: "Smash Double",     suggest: "Truffle Fries",     rate: 81, badge: "Hot" },
  { trigger: "Smash Double",     suggest: "Local IPA",         rate: 56, badge: "Hot" },
  { trigger: "Margherita Pizza", suggest: "House Red (glass)", rate: 54, badge: "Classic" },
  { trigger: "Pepperoni Pizza",  suggest: "House Red (glass)", rate: 48, badge: "Classic" },
  { trigger: "Ribeye 12oz",      suggest: "Crème Brûlée",      rate: 41, badge: "Rising" },
  { trigger: "Ribeye 12oz",      suggest: "House Red (glass)", rate: 62, badge: "Hot" },
  { trigger: "Wings 10pc",       suggest: "Local IPA",         rate: 62, badge: "Hot" },
  { trigger: "Carbonara",        suggest: "Tiramisu",          rate: 33, badge: "Rising" },
  { trigger: "Truffle Pasta",    suggest: "House Red (glass)", rate: 51, badge: "Classic" },
  { trigger: "Grilled Salmon",   suggest: "Crème Brûlée",      rate: 38, badge: "Rising" },
  { trigger: "Caesar Salad",     suggest: "Grilled Salmon",    rate: 38, badge: "Classic" },
];

// Customer profiles (CRM) — pulled when a reservation is seated at a table
type CustomerProfile = {
  name: string;
  visits: number;
  vip?: boolean;
  allergies?: string;
  timingPref?: string;
  notes?: string;
};

const CUSTOMERS: Record<string, CustomerProfile> = {
  "Emma Johnson": { name: "Emma Johnson", visits: 12, vip: true, allergies: "Nut allergy", notes: "Regular — likes window table. Anniversary in June." },
  "Sophia Davis": { name: "Sophia Davis", visits: 4, notes: "Birthday party tonight 🎂 — surprise dessert at 9pm." },
  "James Wilson": { name: "James Wilson", visits: 8, allergies: "Gluten free", timingPref: "Hold mains 15 min after apps", notes: "Always orders the ribeye, medium rare." },
};

const TABLES: { id: number; party: number; guest: string; course: "Mains" | "Apps" | "Drinks" | "Dessert" | "—"; occupied: boolean; reservation?: boolean }[] = [
  { id: 505, party: 4, guest: "Emma Johnson",  course: "Mains",   occupied: true,  reservation: true },
  { id: 514, party: 2, guest: "Walk-in",       course: "Apps",    occupied: true },
  { id: 513, party: 2, guest: "Walk-in",       course: "Drinks",  occupied: true },
  { id: 403, party: 6, guest: "Sophia Davis",  course: "Dessert", occupied: true,  reservation: true },
  { id: 421, party: 2, guest: "James Wilson",  course: "Drinks",  occupied: true,  reservation: true },
  { id: 411, party: 4, guest: "Open",          course: "—",       occupied: false },
  { id: 418, party: 2, guest: "Open",          course: "—",       occupied: false },
  { id: 410, party: 3, guest: "Open",          course: "—",       occupied: false },
];

const CAT_ICON: Record<Category, typeof Coffee> = {
  Starters: Salad, Mains: Beef, Pizza: Pizza, Pasta: Coffee, Steak: Beef, Dessert: IceCream, Drinks: Wine,
};
const CATEGORIES: ("All" | Category)[] = ["All", "Starters", "Mains", "Pizza", "Pasta", "Steak", "Dessert", "Drinks"];

const CUISSON_OPTIONS = ["Rare", "Medium Rare", "Medium", "Medium Well", "Well Done"];
const isSteakItem = (m: MenuItem) =>
  m.category === "Steak" || /steak|ribeye|sirloin|filet|beef/i.test(m.name);

type CartItem = MenuItem & { qty: number; note?: string; guestIndex: number };

function ServerAppPage() {
  const [activeTable, setActiveTable] = useState<number | null>(null);
  const [cat, setCat] = useState<"All" | Category>("All");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [sentOpen, setSentOpen] = useState(false);

  // Customer notes (per table session)
  const [guestName, setGuestName] = useState("");
  const [allergies, setAllergies] = useState("");
  const [timingNote, setTimingNote] = useState("");
  const [otherNote, setOtherNote] = useState("");

  // Step-by-step per-guest flow
  const [partySize, setPartySize] = useState(1);
  const [currentGuest, setCurrentGuest] = useState(1);
  const [guestNames, setGuestNames] = useState<string[]>([]);
  const [reviewing, setReviewing] = useState(false);

  // Per-item note sheet
  const [noteEditingId, setNoteEditingId] = useState<string | null>(null);
  const noteEditing = cart.find(c => c.id === noteEditingId) || null;

  // End-of-guest upsell popup — shown when advancing to next guest / review
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [popupSuggestions, setPopupSuggestions] = useState<
    { item: MenuItem; rate: number; badge: "Hot" | "Rising" | "Classic"; trigger: string }[]
  >([]);
  const [upsellForGuest, setUpsellForGuest] = useState<number>(1);

  const filtered = useMemo(
    () => MENU.filter((m) =>
      (cat === "All" || m.category === cat) &&
      (!query || m.name.toLowerCase().includes(query.toLowerCase()))
    ),
    [cat, query]
  );

  // Current guest's cart slice
  const guestCart = useMemo(
    () => cart.filter(c => c.guestIndex === currentGuest),
    [cart, currentGuest]
  );

  // Next course to push for THIS guest (Appetizer → Main → Dessert → Drink)
  const nextCourse = useMemo(() => {
    if (guestCart.length === 0) return 1;
    const presentRanks = new Set(guestCart.map(c => COURSE_RANK[c.category]));
    for (let r = 1; r <= 4; r++) if (!presentRanks.has(r)) return r;
    return 4;
  }, [guestCart]);

  // Upsells scoped to current guest
  const upsells = useMemo(() => {
    if (guestCart.length === 0) return [];
    const inCart = new Set(guestCart.map(c => c.name));
    const seen = new Set<string>();
    const base = COMBOS
      .filter(c => inCart.has(c.trigger) && !inCart.has(c.suggest))
      .filter(c => { if (seen.has(c.suggest)) return false; seen.add(c.suggest); return true; })
      .map(c => ({ ...c, item: MENU.find(m => m.name === c.suggest)! }))
      .filter(c => c.item);

    return base
      .sort((a, b) => {
        const ra = COURSE_RANK[a.item.category];
        const rb = COURSE_RANK[b.item.category];
        const da = ra === nextCourse ? 0 : Math.abs(ra - nextCourse) + 1;
        const db = rb === nextCourse ? 0 : Math.abs(rb - nextCourse) + 1;
        if (da !== db) return da - db;
        return b.rate - a.rate;
      })
      .slice(0, 4);
  }, [guestCart, nextCourse]);

  const guestSubtotal = guestCart.reduce((s, c) => s + c.price * c.qty, 0);
  const guestItemCount = guestCart.reduce((s, c) => s + c.qty, 0);
  const tableSubtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const tableItemCount = cart.reduce((s, c) => s + c.qty, 0);

  // Per-guest line key includes guestIndex so the same item can be added separately per guest
  const lineKey = (id: string, gi: number) => `${id}__g${gi}`;

  const computeSuggestionsFor = (m: MenuItem, gi: number) => {
    const presentNames = new Set(
      cart.filter(c => c.guestIndex === gi).map(c => c.name).concat(m.name)
    );
    const seen = new Set<string>();
    // 1) Combo-driven suggestions for this trigger
    const combo = COMBOS
      .filter(c => c.trigger === m.name && !presentNames.has(c.suggest))
      .filter(c => { if (seen.has(c.suggest)) return false; seen.add(c.suggest); return true; })
      .map(c => ({ ...c, item: MENU.find(mm => mm.name === c.suggest)! }))
      .filter(c => c.item)
      .sort((a, b) => b.rate - a.rate);

    // 2) Fill to 3 with next-course items (Appetizer → Main → Dessert → Drink)
    const triggerRank = COURSE_RANK[m.category];
    const fillRanks = [triggerRank + 1, triggerRank + 2, triggerRank + 3, triggerRank - 1];
    const filler: typeof combo = [];
    for (const r of fillRanks) {
      if (combo.length + filler.length >= 3) break;
      const candidates = MENU
        .filter(mm => COURSE_RANK[mm.category] === r && !presentNames.has(mm.name) && !seen.has(mm.name));
      for (const cand of candidates) {
        if (combo.length + filler.length >= 3) break;
        seen.add(cand.name);
        filler.push({
          item: cand,
          trigger: m.name,
          suggest: cand.name,
          rate: 30 + Math.floor(Math.random() * 15),
          badge: "Classic" as const,
        });
      }
    }
    return [...combo, ...filler].slice(0, 3);
  };

  const addItem = (m: MenuItem, opts?: { silent?: boolean }) => {
    const gi = currentGuest;
    const alreadyExisted = !!cart.find(x => x.id === m.id && x.guestIndex === gi);
    setCart((c) => {
      const existing = c.find(x => x.id === m.id && x.guestIndex === gi);
      if (existing) {
        return c.map(x =>
          x.id === m.id && x.guestIndex === gi ? { ...x, qty: x.qty + 1 } : x
        );
      }
      return [...c, { ...m, qty: 1, guestIndex: gi }];
    });
    if (isSteakItem(m) && !alreadyExisted) {
      setNoteEditingId(lineKey(m.id, gi));
      return;
    }
  };
  const dec = (key: string) =>
    setCart((c) => c.flatMap(x =>
      lineKey(x.id, x.guestIndex) === key
        ? (x.qty > 1 ? [{ ...x, qty: x.qty - 1 }] : [])
        : [x]
    ));
  const incKey = (key: string) =>
    setCart((c) => c.map(x =>
      lineKey(x.id, x.guestIndex) === key ? { ...x, qty: x.qty + 1 } : x
    ));
  const remove = (key: string) =>
    setCart((c) => c.filter(x => lineKey(x.id, x.guestIndex) !== key));
  const setNote = (key: string, note: string) =>
    setCart((c) => c.map(x =>
      lineKey(x.id, x.guestIndex) === key ? { ...x, note } : x
    ));

  // Translate keyed note editing back to a cart item
  const noteEditingItem = useMemo(() => {
    if (!noteEditingId) return null;
    return cart.find(x => lineKey(x.id, x.guestIndex) === noteEditingId) || null;
  }, [noteEditingId, cart]);

  const computeGuestSuggestions = (gi: number) => {
    const guestItems = cart.filter(c => c.guestIndex === gi);
    if (guestItems.length === 0) return [];
    const presentNames = new Set(guestItems.map(c => c.name));
    const seen = new Set<string>();
    const combo = COMBOS
      .filter(c => presentNames.has(c.trigger) && !presentNames.has(c.suggest))
      .filter(c => { if (seen.has(c.suggest)) return false; seen.add(c.suggest); return true; })
      .map(c => ({ ...c, item: MENU.find(mm => mm.name === c.suggest)! }))
      .filter(c => c.item)
      .sort((a, b) => b.rate - a.rate);

    const presentRanks = new Set(guestItems.map(c => COURSE_RANK[c.category]));
    let next = 1;
    for (let r = 1; r <= 4; r++) if (!presentRanks.has(r)) { next = r; break; }
    const filler: typeof combo = [];
    for (const r of [next, next + 1, 4]) {
      if (combo.length + filler.length >= 3) break;
      for (const mm of MENU) {
        if (combo.length + filler.length >= 3) break;
        if (COURSE_RANK[mm.category] !== r) continue;
        if (presentNames.has(mm.name) || seen.has(mm.name)) continue;
        seen.add(mm.name);
        filler.push({
          item: mm, trigger: guestItems[0].name, suggest: mm.name,
          rate: 30 + Math.floor(Math.random() * 15), badge: "Classic" as const,
        });
      }
    }
    return [...combo, ...filler].slice(0, 3);
  };

  const advanceGuest = () => {
    if (currentGuest < partySize) setCurrentGuest(currentGuest + 1);
    else setReviewing(true);
  };

  const goNextGuest = () => {
    const suggestions = computeGuestSuggestions(currentGuest);
    if (suggestions.length > 0) {
      setPopupSuggestions(suggestions);
      setUpsellForGuest(currentGuest);
      setUpsellOpen(true);
      return;
    }
    advanceGuest();
  };
  const goPrevGuest = () => {
    if (reviewing) { setReviewing(false); return; }
    if (currentGuest > 1) setCurrentGuest(currentGuest - 1);
  };

  const sendOrderRpc = useServerFn(sendOrderFn);
  const logoutRpc = useServerFn(logoutFn);
  const navigate = Route.useNavigate();
  const { me } = Route.useRouteContext();

  const sendOrder = async () => {
    if (cart.length === 0) { toast.error("Cart is empty"); return; }
    if (activeTable == null) { toast.error("Pick a table first"); return; }
    try {
      await sendOrderRpc({
        data: {
          tableNumber: activeTable,
          partySize,
          items: cart.map(c => ({
            name: c.name,
            category: c.category,
            priceCents: Math.round(c.price * 100),
            qty: c.qty,
            guestIndex: c.guestIndex,
            wasUpsell: false,
          })),
        },
      });
      setSentOpen(true);
      toast.success(`Order sent — Table ${activeTable}`, {
        description: `${partySize} guest tab${partySize > 1 ? "s" : ""} saved to your shift`,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send order");
    }
  };

  const signOut = async () => {
    await logoutRpc();
    navigate({ to: "/server-login" });
  };

  const resetSession = () => {
    setCart([]); setShowCart(false); setSentOpen(false); setActiveTable(null);
    setGuestName(""); setAllergies(""); setTimingNote(""); setOtherNote("");
    setPartySize(1); setCurrentGuest(1); setGuestNames([]); setReviewing(false);
  };

  const setGuestNameAt = (i: number, v: string) =>
    setGuestNames((arr) => {
      const next = [...arr];
      next[i] = v;
      return next;
    });

  // Pull customer profile from the reservation when seating a table
  const selectTable = (tableId: number) => {
    const t = TABLES.find(x => x.id === tableId);
    setActiveTable(tableId);
    if (!t) return;
    const size = Math.max(1, t.party || 1);
    setPartySize(size);
    setCurrentGuest(1);
    setReviewing(false);
    const profile = t.reservation ? CUSTOMERS[t.guest] : undefined;
    const names = Array.from({ length: size }, (_, i) =>
      i === 0 && profile ? profile.name : ""
    );
    setGuestNames(names);
    if (profile) {
      setGuestName(profile.name);
      setAllergies(profile.allergies || "");
      setTimingNote(profile.timingPref || "");
      setOtherNote(
        [
          profile.vip ? "⭐ VIP" : "",
          profile.visits ? `${profile.visits} prior visits` : "",
          profile.notes || "",
        ].filter(Boolean).join(" · ")
      );
      toast.success(`Profile loaded — ${profile.name}`, {
        description: profile.vip ? "VIP guest" : `${profile.visits} prior visits`,
      });
    } else if (t.guest && t.guest !== "Open" && t.guest !== "Walk-in") {
      setGuestName(t.guest);
    }
  };

  const activeProfile = activeTable
    ? (() => {
        const t = TABLES.find(x => x.id === activeTable);
        return t?.reservation ? CUSTOMERS[t.guest] : undefined;
      })()
    : undefined;

  const guestLabel = (i: number) => guestNames[i - 1]?.trim() || `Guest ${i}`;

  // ---------- Table picker ----------
  if (activeTable === null) {
    return (
      <AppShell>
        <div className="px-4 sm:px-8 pt-4 pb-12 max-w-3xl mx-auto">
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Demo POS only — orders write to a shared global table, not your restaurant tenant. Do not use for live service.
          </div>
          <div className="mb-4">
            <h1 className="text-2xl font-semibold text-foreground">Pick a table</h1>
            <p className="text-sm text-muted-foreground">Tap a table to start an order</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {TABLES.map((t) => {
              const profile = t.reservation ? CUSTOMERS[t.guest] : undefined;
              return (
                <button
                  key={t.id}
                  onClick={() => selectTable(t.id)}
                  className={`text-left rounded-xl border p-4 transition active:scale-[0.98] ${
                    t.occupied
                      ? "border-border bg-card hover:bg-accent"
                      : "border-dashed border-border bg-muted/30 hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-semibold">{t.id}</div>
                    <Badge variant="outline" className="text-[10px]">{t.party} top</Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-sm font-medium truncate">
                    {profile?.vip && <span className="text-amber-500" title="VIP">⭐</span>}
                    <span className="truncate">{t.guest}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    {t.reservation && (
                      <Badge variant="secondary" className="text-[9px] h-4 px-1">Res</Badge>
                    )}
                    {profile?.allergies && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1 border-destructive/40 text-destructive">
                        Allergy
                      </Badge>
                    )}
                    <span>{t.occupied ? `Course: ${t.course}` : "Available"}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </AppShell>

    );
  }

  // ---------- Order pad ----------
  return (
    <AppShell>
      <div className="px-3 sm:px-6 lg:px-8 pt-3 pb-32 lg:pb-8 lg:grid lg:grid-cols-[1fr_380px] lg:gap-5 max-w-7xl mx-auto">
        {/* LEFT: Stepper + Menu (or Review) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => { setActiveTable(null); setCart([]); }}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="size-4" /> Tables
            </button>
            <div className="text-right">
              <div className="text-[11px] text-muted-foreground">Now serving</div>
              <div className="text-base font-semibold">Table {activeTable} · {partySize}-top</div>
            </div>
          </div>

          {/* Guest stepper */}
          <GuestStepper
            partySize={partySize}
            currentGuest={currentGuest}
            reviewing={reviewing}
            guestNames={guestNames}
            cart={cart}
            onPick={(i) => { setReviewing(false); setCurrentGuest(i); }}
            onReview={() => setReviewing(true)}
          />

          {/* Mobile profile banner (compact) */}
          {activeProfile && (
            <div className="lg:hidden mb-3">
              <ProfileBanner profile={activeProfile} />
            </div>
          )}

          {reviewing ? (
            <ReviewPanel
              cart={cart}
              partySize={partySize}
              guestNames={guestNames}
              tableSubtotal={tableSubtotal}
              onEditGuest={(i) => { setReviewing(false); setCurrentGuest(i); }}
              onSend={sendOrder}
            />
          ) : (
            <>
              {/* Per-guest header — minimal */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="text-sm font-medium">
                  Guest {currentGuest}
                  <span className="text-muted-foreground font-normal">
                    {" · "}{guestItemCount} item{guestItemCount === 1 ? "" : "s"} · ${guestSubtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="size-8" onClick={goPrevGuest} disabled={currentGuest === 1 && !reviewing}>
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={goNextGuest} className="h-8">
                    {currentGuest < partySize ? (
                      <>Next <ChevronRight className="size-4 ml-0.5" /></>
                    ) : (
                      <>Review <ClipboardList className="size-4 ml-1" /></>
                    )}
                  </Button>
                </div>
              </div>


              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search menu…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
                {CATEGORIES.map((c) => {
                  const Icon = c === "All" ? Sparkles : CAT_ICON[c as Category];
                  const active = cat === c;
                  return (
                    <button
                      key={c}
                      onClick={() => setCat(c)}
                      className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition ${
                        active
                          ? "bg-foreground text-background border-foreground"
                          : "bg-card text-foreground border-border hover:bg-accent"
                      }`}
                    >
                      <Icon className="size-3.5" /> {c}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filtered.map((m) => {
                  const inCart = guestCart.find(c => c.id === m.id);
                  const pair = MENU.find(x => x.id === m.pairsWith);
                  const Icon = CAT_ICON[m.category];
                  return (
                    <div
                      key={m.id}
                      className="rounded-xl border border-border bg-card p-3 transition hover:bg-accent/40 flex flex-col gap-2"
                    >
                      <button
                        onClick={() => addItem(m)}
                        className="text-left flex items-start gap-3 active:scale-[0.99] transition"
                      >
                        <div className="size-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                          <Icon className="size-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-sm font-medium leading-tight">{m.name}</div>
                            <div className="text-sm font-semibold shrink-0">${m.price}</div>
                          </div>
                          <div className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                            {m.description}
                          </div>
                        </div>
                        {inCart && (
                          <Badge className="h-4 text-[10px] px-1.5 shrink-0">{inCart.qty}</Badge>
                        )}
                      </button>
                      {pair && (
                        <button
                          onClick={(e) => { e.stopPropagation(); addItem(pair); }}
                          className="self-start inline-flex items-center gap-1.5 rounded-full border border-dashed border-border bg-background/60 px-2.5 py-1 text-[11px] text-muted-foreground hover:border-foreground/40 hover:text-foreground transition"
                        >
                          <Sparkles className="size-3" />
                          <span>Goes well with</span>
                          <span className="font-medium text-foreground">{pair.name}</span>
                          <Plus className="size-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* RIGHT (desktop): Profile + Cart */}
        <aside className="hidden lg:block">
          <div className="sticky top-4 space-y-3">
            {activeProfile && <ProfileBanner profile={activeProfile} />}
            {!reviewing && (
              <CartPanel
                cart={guestCart} dec={dec} inc={incKey} remove={remove}
                subtotal={guestSubtotal}
                title={`Guest ${currentGuest} of ${partySize}`}
                onEditNote={setNoteEditingId} lineKey={lineKey}
                onPrimary={goNextGuest}
                primaryLabel={currentGuest < partySize ? `Next guest` : "Review order"}
                primaryIcon={currentGuest < partySize ? "next" : "review"}
              />
            )}
            {reviewing && (
              <Card className="p-4 rounded-xl">
                <div className="text-sm font-semibold mb-1">Table total</div>
                <div className="text-2xl font-semibold mb-3">${tableSubtotal.toFixed(2)}</div>
                <Button className="w-full" onClick={sendOrder} disabled={cart.length === 0}>
                  <Send className="size-4 mr-1.5" /> Send to kitchen
                </Button>
                <p className="text-[11px] text-muted-foreground mt-2 text-center">
                  POS will receive {partySize} separate tabs ready to split.
                </p>
              </Card>
            )}
          </div>
        </aside>

      </div>

      {/* Mobile sticky cart bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur p-3 flex items-center gap-2">
        <button
          onClick={() => setShowCart(true)}
          className="flex-1 flex items-center justify-between rounded-xl bg-foreground text-background px-4 py-2.5"
        >
          <span className="text-sm font-medium truncate">
            {reviewing
              ? `Table · ${tableItemCount} item${tableItemCount === 1 ? "" : "s"}`
              : `${guestLabel(currentGuest)} · ${guestItemCount} item${guestItemCount === 1 ? "" : "s"}`}
          </span>
          <span className="text-sm font-semibold">
            ${(reviewing ? tableSubtotal : guestSubtotal).toFixed(2)}
          </span>
        </button>
        {reviewing ? (
          <Button onClick={sendOrder} className="h-11 px-4" disabled={cart.length === 0}>
            <Send className="size-4 mr-1" /> Send
          </Button>
        ) : (
          <Button onClick={goNextGuest} className="h-11 px-4">
            {currentGuest < partySize ? (
              <><ChevronRight className="size-4" /></>
            ) : (
              <><ClipboardList className="size-4 mr-1" /> Review</>
            )}
          </Button>
        )}
      </div>

      {/* Mobile cart sheet — shows current guest's tab */}
      <Sheet open={showCart} onOpenChange={setShowCart}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {reviewing ? `Table ${activeTable} · Review` : `${guestLabel(currentGuest)} · Guest ${currentGuest}/${partySize}`}
            </SheetTitle>
            <SheetDescription>
              {reviewing
                ? `${tableItemCount} items · $${tableSubtotal.toFixed(2)} · ${partySize} tabs`
                : `${guestItemCount} items · $${guestSubtotal.toFixed(2)}`}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {reviewing ? (
              <ReviewPanel
                cart={cart}
                partySize={partySize}
                guestNames={guestNames}
                tableSubtotal={tableSubtotal}
                onEditGuest={(i) => { setReviewing(false); setCurrentGuest(i); setShowCart(false); }}
                onSend={sendOrder}
              />
            ) : (
              <>
                <CartPanel
                  cart={guestCart} dec={dec} inc={incKey} remove={remove}
                  subtotal={guestSubtotal}
                  title={`${guestLabel(currentGuest)}`}
                  onEditNote={setNoteEditingId} lineKey={lineKey}
                  onPrimary={() => { goNextGuest(); setShowCart(false); }}
                  primaryLabel={currentGuest < partySize ? `Next: Guest ${currentGuest + 1}` : "Review order"}
                  primaryIcon={currentGuest < partySize ? "next" : "review"}
                  embedded
                />
                
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Per-item note sheet */}
      <Sheet open={!!noteEditingItem} onOpenChange={(o) => !o && setNoteEditingId(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          {noteEditingItem && noteEditingId && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <StickyNote className="size-4" /> Note · {noteEditingItem.name}
                </SheetTitle>
                <SheetDescription>
                  {guestLabel(noteEditingItem.guestIndex)} ·{" "}
                  {isSteakItem(noteEditingItem)
                    ? "Pick a cuisson or add custom instructions for the kitchen."
                    : "Add special instructions for the kitchen."}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                {isSteakItem(noteEditingItem) && (
                  <div className="flex flex-wrap gap-2">
                    {CUISSON_OPTIONS.map((c) => {
                      const active = noteEditingItem.note === c;
                      return (
                        <button
                          key={c}
                          onClick={() => setNote(noteEditingId, c)}
                          className={`rounded-full px-3 py-1.5 text-xs font-medium border transition ${
                            active
                              ? "bg-foreground text-background border-foreground"
                              : "bg-card text-foreground border-border hover:bg-accent"
                          }`}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                )}
                <Textarea
                  placeholder="e.g. no onions, gluten-free bun, sauce on side…"
                  value={noteEditingItem.note || ""}
                  onChange={(e) => setNote(noteEditingId, e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setNote(noteEditingId, "")}>
                    Clear
                  </Button>
                  <Button className="flex-1" onClick={() => setNoteEditingId(null)}>
                    Done
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* End-of-guest upsell — fires when advancing to next guest / review */}
      <Dialog
        open={upsellOpen}
        onOpenChange={(o) => {
          if (!o) {
            setUpsellOpen(false);
            advanceGuest();
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-3xl p-0 gap-0 overflow-hidden border-border/60 [&>button]:hidden">
          <div className="px-6 pt-6 pb-4 text-center">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">
              Before moving on
            </div>
            <div className="mt-1 text-lg font-semibold tracking-tight">
              Anything else for Guest {upsellForGuest}?
            </div>
          </div>

          <div className="px-4 pb-3 grid grid-cols-3 gap-2">
            {popupSuggestions.map((u) => {
              const accent =
                u.badge === "Hot"
                  ? "text-orange-500"
                  : u.badge === "Rising"
                    ? "text-emerald-500"
                    : "text-muted-foreground";
              return (
                <button
                  key={u.item.id}
                  onClick={() => {
                    addItem(u.item, { silent: true });
                    setUpsellOpen(false);
                    advanceGuest();
                  }}
                  className="group relative flex flex-col rounded-2xl border border-border/70 bg-card p-3 text-left transition hover:border-foreground/40 hover:shadow-sm active:scale-[0.98]"
                >
                  <div className={cn("text-[10px] font-medium uppercase tracking-wider", accent)}>
                    {u.badge}
                  </div>
                  <div className="mt-1 text-sm font-medium leading-snug line-clamp-2 min-h-[2.5rem]">
                    {u.item.name}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-semibold tabular-nums">
                      ${u.item.price}
                    </span>
                    <span className="flex size-7 items-center justify-center rounded-full bg-foreground text-background transition group-hover:scale-110">
                      <Plus className="size-3.5" strokeWidth={2.5} />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => { setUpsellOpen(false); advanceGuest(); }}
            className="w-full border-t border-border/60 py-3 text-xs font-medium text-muted-foreground hover:bg-accent/40 hover:text-foreground transition"
          >
            No thanks
          </button>
        </DialogContent>
      </Dialog>



      {/* Sent confirmation */}
      <Sheet open={sentOpen} onOpenChange={setSentOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Order fired 🔥</SheetTitle>
            <SheetDescription>
              Table {activeTable} · ${tableSubtotal.toFixed(2)} · {partySize} guest tab{partySize > 1 ? "s" : ""} sent
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setSentOpen(false)}>
              Add more
            </Button>
            <Button className="flex-1" onClick={resetSession}>
              Done
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

// ---------- Subcomponents ----------
function GuestStepper({
  partySize, currentGuest, reviewing, guestNames, cart, onPick, onReview,
}: {
  partySize: number; currentGuest: number; reviewing: boolean;
  guestNames: string[]; cart: CartItem[];
  onPick: (i: number) => void; onReview: () => void;
}) {
  return (
    <div className="mb-3">

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {Array.from({ length: partySize }, (_, idx) => {
          const i = idx + 1;
          const items = cart.filter(c => c.guestIndex === i);
          const count = items.reduce((s, c) => s + c.qty, 0);
          const active = !reviewing && currentGuest === i;
          const done = count > 0;
          const name = guestNames[i - 1]?.trim();
          return (
            <button
              key={i}
              onClick={() => onPick(i)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition ${
                active
                  ? "bg-foreground text-background border-foreground"
                  : done
                  ? "bg-success/10 text-foreground border-success/40"
                  : "bg-card text-foreground border-border hover:bg-accent"
              }`}
            >
              <span className={`size-4 rounded-full inline-flex items-center justify-center text-[10px] ${
                active ? "bg-background/20" : done ? "bg-success text-white" : "bg-muted text-muted-foreground"
              }`}>
                {done && !active ? <CheckCircle2 className="size-3" /> : i}
              </span>
              <span className="truncate max-w-[80px]">{name || `Guest ${i}`}</span>
              {count > 0 && (
                <Badge variant="outline" className="h-4 text-[9px] px-1 border-current">
                  {count}
                </Badge>
              )}
            </button>
          );
        })}
        <button
          onClick={onReview}
          className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition ${
            reviewing
              ? "bg-foreground text-background border-foreground"
              : "bg-card text-foreground border-border hover:bg-accent"
          }`}
        >
          <ClipboardList className="size-3.5" /> Review
        </button>
      </div>
    </div>
  );
}

function ProfileBanner({ profile }: { profile: CustomerProfile }) {
  return (
    <Card className="p-3 rounded-xl border-primary/30 bg-primary/5">
      <div className="flex items-start gap-3">
        <div className="size-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
          {profile.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold truncate">{profile.name}</span>
            {profile.vip && (
              <Badge className="h-4 text-[10px] px-1.5 bg-amber-500 hover:bg-amber-500 text-white border-0">
                ⭐ VIP
              </Badge>
            )}
            <Badge variant="outline" className="h-4 text-[10px] px-1.5">
              {profile.visits} visits
            </Badge>
          </div>
          {profile.allergies && (
            <div className="mt-1 text-[11px] text-destructive flex items-center gap-1">
              <AlertTriangle className="size-3" /> {profile.allergies}
            </div>
          )}
          {profile.notes && (
            <div className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{profile.notes}</div>
          )}
          <div className="mt-1 text-[10px] text-muted-foreground">Pulled from reservation · Guest 1</div>
        </div>
      </div>
    </Card>
  );
}


function CartPanel({
  cart, dec, inc, remove, subtotal, title, onEditNote, lineKey,
  onPrimary, primaryLabel, primaryIcon, embedded,
}: {
  cart: CartItem[];
  dec: (key: string) => void;
  inc: (key: string) => void;
  remove: (key: string) => void;
  subtotal: number;
  title: string;
  onEditNote: (key: string) => void;
  lineKey: (id: string, gi: number) => string;
  onPrimary?: () => void;
  primaryLabel?: string;
  primaryIcon?: "next" | "review";
  embedded?: boolean;
}) {
  return (
    <Card className={`p-4 rounded-xl ${embedded ? "border-0 shadow-none p-0" : ""}`}>
      {!embedded && (
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground truncate">{title}</h2>
          <Badge variant="outline" className="text-[10px]">{cart.length} lines</Badge>
        </div>
      )}
      {cart.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Tap menu items to add them to this guest's tab.
        </p>
      ) : (
        <ul className="space-y-2 mb-3">
          {cart.map((c) => {
            const k = lineKey(c.id, c.guestIndex);
            return (
              <li key={k} className="rounded-lg border border-border p-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground">${c.price.toFixed(2)} ea</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="size-7" onClick={() => dec(k)}>
                      <Minus className="size-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-medium">{c.qty}</span>
                    <Button size="icon" variant="outline" className="size-7" onClick={() => inc(k)}>
                      <Plus className="size-3" />
                    </Button>
                  </div>
                  <div className="w-14 text-right text-sm font-semibold">${(c.price * c.qty).toFixed(2)}</div>
                  <button onClick={() => remove(k)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => onEditNote(k)}
                  className={`mt-1.5 w-full text-left text-[11px] rounded-md px-2 py-1 border border-dashed transition flex items-center gap-1 ${
                    c.note
                      ? "border-foreground/30 bg-accent/40 text-foreground"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <StickyNote className="size-3 shrink-0" />
                  <span className="truncate">
                    {c.note || (isSteakItem(c) ? "Add cuisson / note" : "Add note")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex items-center justify-between text-sm border-t border-border pt-3">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="font-semibold text-base">${subtotal.toFixed(2)}</span>
      </div>
      {!embedded && onPrimary && (
        <Button className="w-full mt-3" onClick={onPrimary}>
          {primaryIcon === "review" ? (
            <><ClipboardList className="size-4 mr-1.5" /> {primaryLabel}</>
          ) : (
            <>{primaryLabel} <ChevronRight className="size-4 ml-1" /></>
          )}
        </Button>
      )}
    </Card>
  );
}

function ReviewPanel({
  cart, partySize, guestNames, tableSubtotal, onEditGuest, onSend,
}: {
  cart: CartItem[]; partySize: number; guestNames: string[];
  tableSubtotal: number; onEditGuest: (i: number) => void; onSend: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="size-5" /> Review · {partySize} tab{partySize > 1 ? "s" : ""}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            POS will receive {partySize} separate tabs ready to split.
          </p>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-muted-foreground">Table total</div>
          <div className="text-xl font-semibold">${tableSubtotal.toFixed(2)}</div>
        </div>
      </div>

      <div className="space-y-3">
        {Array.from({ length: partySize }, (_, idx) => {
          const i = idx + 1;
          const items = cart.filter(c => c.guestIndex === i);
          const sub = items.reduce((s, c) => s + c.price * c.qty, 0);
          const name = guestNames[i - 1]?.trim() || `Guest ${i}`;
          return (
            <Card key={i} className="p-3 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-semibold">
                    {i}
                  </div>
                  <div className="text-sm font-semibold">{name}</div>
                  <Badge variant="outline" className="text-[10px]">
                    {items.reduce((s, c) => s + c.qty, 0)} items
                  </Badge>
                </div>
                <button
                  onClick={() => onEditGuest(i)}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                >
                  Edit
                </button>
              </div>
              {items.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic py-2">No items yet — tap Edit to add.</p>
              ) : (
                <ul className="space-y-1">
                  {items.map((c, k) => (
                    <li key={k} className="flex items-center justify-between text-sm">
                      <div className="flex-1 min-w-0">
                        <div className="truncate">
                          <span className="text-muted-foreground mr-1.5">{c.qty}×</span>
                          {c.name}
                        </div>
                        {c.note && (
                          <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                            <StickyNote className="size-3 shrink-0" /> {c.note}
                          </div>
                        )}
                      </div>
                      <div className="ml-2 text-sm font-medium tabular-nums">${(c.price * c.qty).toFixed(2)}</div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tab subtotal</span>
                <span className="font-semibold">${sub.toFixed(2)}</span>
              </div>
            </Card>
          );
        })}
      </div>

      <Button className="w-full" size="lg" onClick={onSend} disabled={cart.length === 0}>
        <Send className="size-4 mr-1.5" /> Send all tabs to kitchen
      </Button>
    </div>
  );
}

