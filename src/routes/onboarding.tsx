import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight, Check, Copy, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { clearSelectedPlan, readSelectedPlan } from "@/lib/plans";
import { DEFAULT_HOURS, type WeekHours } from "@/components/onboarding/HoursEditor";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Setup — RestoStack" }] }),
  component: TypeformOnboardingPage,
});

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  cuisine: string | null;
  brand_primary: string | null;
  hours: WeekHours | null;
  onboarding_completed_at: string | null;
};

const CUISINES = ["Italian", "American", "Japanese", "Mexican", "Café", "Seafood", "Steakhouse", "Other"];
const HOUR_PRESETS: { id: string; label: string; hint: string; hours: WeekHours }[] = [
  {
    id: "dinner",
    label: "Dinner focused",
    hint: "Tue–Sun evenings",
    hours: {
      mon: { closed: true, open: "17:00", close: "22:00" },
      tue: { closed: false, open: "17:00", close: "22:00" },
      wed: { closed: false, open: "17:00", close: "22:00" },
      thu: { closed: false, open: "17:00", close: "22:00" },
      fri: { closed: false, open: "17:00", close: "23:00" },
      sat: { closed: false, open: "17:00", close: "23:00" },
      sun: { closed: false, open: "17:00", close: "21:00" },
    },
  },
  {
    id: "allday",
    label: "All day",
    hint: "Brunch through dinner",
    hours: DEFAULT_HOURS,
  },
  {
    id: "weekends",
    label: "Weekends + weeknights",
    hint: "Thu–Sun peak",
    hours: {
      mon: { closed: true, open: "11:00", close: "22:00" },
      tue: { closed: true, open: "11:00", close: "22:00" },
      wed: { closed: true, open: "11:00", close: "22:00" },
      thu: { closed: false, open: "16:00", close: "23:00" },
      fri: { closed: false, open: "11:00", close: "23:00" },
      sat: { closed: false, open: "10:00", close: "23:00" },
      sun: { closed: false, open: "10:00", close: "21:00" },
    },
  },
];

const COLORS = ["#059669", "#0f766e", "#1d4ed8", "#7c3aed", "#be123c", "#c2410c", "#171717"];

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function TypeformOnboardingPage() {
  const { session, staff, loading, refreshStaff } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);

  const [fullName, setFullName] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [city, setCity] = useState("");
  const [cuisine, setCuisine] = useState("Italian");
  const [seats, setSeats] = useState("40");
  const [hoursId, setHoursId] = useState("dinner");
  const [brand, setBrand] = useState(COLORS[0]);
  const [menuText, setMenuText] = useState("Margherita Pizza\nHouse Salad\nTiramisu");
  const [copied, setCopied] = useState(false);

  const totalSteps = 9;
  const progress = ((step + 1) / totalSteps) * 100;

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/start", replace: true });
      return;
    }
    const metaName = (session.user.user_metadata?.full_name as string | undefined) || "";
    if (metaName) setFullName((v) => v || metaName);

    (async () => {
      if (!staff) return;
      const { data } = await supabase
        .from("v2_restaurants")
        .select("id,name,slug,city,cuisine,brand_primary,hours,onboarding_completed_at")
        .eq("id", staff.restaurant_id)
        .maybeSingle();
      if (data) {
        const r = data as unknown as Restaurant;
        setRestaurant(r);
        setRestaurantName(r.name || "");
        setCity(r.city || "");
        setCuisine(r.cuisine || "Italian");
        setBrand(r.brand_primary || COLORS[0]);
        if (r.onboarding_completed_at) {
          // Allow revisiting, but start near the end if already complete.
          setStep(8);
        }
      }
      if (staff.full_name) setFullName((v) => v || staff.full_name);
    })();
  }, [loading, session, staff, navigate]);

  const bookingUrl = useMemo(() => {
    if (!restaurant?.slug || typeof window === "undefined") return "";
    return `${window.location.origin}/book/${restaurant.slug}`;
  }, [restaurant?.slug]);

  const ensureRestaurant = async () => {
    if (restaurant) return restaurant;
    if (!restaurantName.trim()) throw new Error("Restaurant name is required.");
    const plan = readSelectedPlan();
    const { data, error: rpcErr } = await supabase.rpc("v2_signup_create_restaurant", {
      _restaurant_name: restaurantName.trim(),
      _slug: slugify(restaurantName),
      _city: city.trim(),
      _full_name: fullName.trim() || "Owner",
      _plan: plan,
    } as never);
    if (rpcErr) {
      // If restaurant already exists for this user, reload staff/restaurant.
      if (/already has a restaurant/i.test(rpcErr.message)) {
        await refreshStaff();
        throw new Error("Restaurant already linked — refreshing…");
      }
      throw rpcErr;
    }
    const row = Array.isArray(data) ? data[0] : data;
    const id = (row as { out_restaurant_id?: string })?.out_restaurant_id;
    await refreshStaff();
    clearSelectedPlan();
    if (!id) throw new Error("Could not create restaurant.");
    const { data: r } = await supabase
      .from("v2_restaurants")
      .select("id,name,slug,city,cuisine,brand_primary,hours,onboarding_completed_at")
      .eq("id", id)
      .maybeSingle();
    const created = r as unknown as Restaurant;
    setRestaurant(created);
    return created;
  };

  const next = async () => {
    setError(null);
    setBusy(true);
    try {
      if (step === 0) {
        if (!fullName.trim()) throw new Error("Tell us your name to continue.");
        if (staff) {
          await supabase.from("v2_users").update({ full_name: fullName.trim() }).eq("id", staff.id);
        }
        setStep(1);
      } else if (step === 1) {
        if (!restaurantName.trim()) throw new Error("What’s the restaurant called?");
        setStep(2);
      } else if (step === 2) {
        const r = await ensureRestaurant();
        if (city.trim()) {
          await supabase.from("v2_restaurants").update({ city: city.trim() }).eq("id", r.id);
          setRestaurant({ ...r, city: city.trim() });
        }
        setStep(3);
      } else if (step === 3) {
        const r = restaurant ?? (await ensureRestaurant());
        await supabase.from("v2_restaurants").update({ cuisine }).eq("id", r.id);
        setRestaurant({ ...r, cuisine });
        setStep(4);
      } else if (step === 4) {
        const r = restaurant ?? (await ensureRestaurant());
        const n = Math.max(1, Math.min(500, Number(seats) || 40));
        // Seed a simple table pack based on seats (approx 2-tops / 4-tops).
        const { count } = await supabase
          .from("v2_tables")
          .select("id", { count: "exact", head: true })
          .eq("restaurant_id", r.id);
        if (!count) {
          const twos = Math.max(2, Math.round(n * 0.3));
          const fours = Math.max(2, Math.round(n * 0.15));
          const rows = [
            ...Array.from({ length: twos }, (_, i) => ({
              restaurant_id: r.id,
              table_number: `T${i + 1}`,
              capacity: 2,
              section: "Main Floor",
              shape: "square" as const,
              status: "available" as const,
            })),
            ...Array.from({ length: fours }, (_, i) => ({
              restaurant_id: r.id,
              table_number: `B${i + 1}`,
              capacity: 4,
              section: "Main Floor",
              shape: "rectangle" as const,
              status: "available" as const,
            })),
          ];
          await supabase.from("v2_tables").insert(rows as never);
        }
        setStep(5);
      } else if (step === 5) {
        const r = restaurant ?? (await ensureRestaurant());
        const preset = HOUR_PRESETS.find((h) => h.id === hoursId) ?? HOUR_PRESETS[0];
        await supabase.from("v2_restaurants").update({ hours: preset.hours as never }).eq("id", r.id);
        setRestaurant({ ...r, hours: preset.hours });
        setStep(6);
      } else if (step === 6) {
        const r = restaurant ?? (await ensureRestaurant());
        await supabase
          .from("v2_restaurants")
          .update({
            brand_primary: brand,
            brand_accent: brand,
            booking_headline: `Reserve a table at ${r.name}`,
            booking_welcome: `Welcome to ${r.name}. Book in seconds.`,
          })
          .eq("id", r.id);
        setRestaurant({ ...r, brand_primary: brand });
        setStep(7);
      } else if (step === 7) {
        const r = restaurant ?? (await ensureRestaurant());
        const items = menuText
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .slice(0, 8);
        if (items.length) {
          const { data: existingCats } = await supabase
            .from("v2_menu_categories")
            .select("id")
            .eq("restaurant_id", r.id)
            .limit(1);
          let catId = existingCats?.[0]?.id;
          if (!catId) {
            const { data: cat } = await supabase
              .from("v2_menu_categories")
              .insert({ restaurant_id: r.id, name: "Favorites", sort_order: 0 } as never)
              .select("id")
              .maybeSingle();
            catId = cat?.id;
          }
          if (catId) {
            const { count } = await supabase
              .from("v2_menu_items")
              .select("id", { count: "exact", head: true })
              .eq("restaurant_id", r.id);
            if (!count) {
              await supabase.from("v2_menu_items").insert(
                items.map((name, i) => ({
                  restaurant_id: r.id,
                  category_id: catId,
                  name,
                  price: 18 + i * 2,
                  is_available: true,
                })) as never,
              );
            }
          }
        }
        setStep(8);
      } else if (step === 8) {
        const r = restaurant ?? (await ensureRestaurant());
        await supabase
          .from("v2_restaurants")
          .update({ onboarding_completed_at: new Date().toISOString() })
          .eq("id", r.id);
        await refreshStaff();
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (e) {
      const msg = (e as Error).message || "Could not continue.";
      if (/refreshing/i.test(msg)) {
        // retry load after staff exists
        setTimeout(() => setStep((s) => s), 0);
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && step !== 7) {
      e.preventDefault();
      void next();
    }
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-950 text-slate-300">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" onKeyDown={onKeyDown}>
      <div className="h-1 bg-slate-800">
        <div
          className="h-full bg-emerald-400 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 min-h-[calc(100vh-4px)] flex flex-col">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>RestoStack setup</span>
          <span>
            {step + 1} / {totalSteps}
          </span>
        </div>

        <div className="flex-1 flex flex-col justify-center py-10">
          <div key={step} className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
            {step === 0 && (
              <Question
                eyebrow="Welcome"
                title="First — what’s your name?"
                subtitle="We’ll use this on your owner profile."
              >
                <BigInput value={fullName} onChange={setFullName} placeholder="Alex Morgan" autoFocus />
              </Question>
            )}

            {step === 1 && (
              <Question
                eyebrow="Your restaurant"
                title="What’s your restaurant called?"
                subtitle="This becomes your public booking page name."
              >
                <BigInput
                  value={restaurantName}
                  onChange={setRestaurantName}
                  placeholder="Nonna’s Kitchen"
                  autoFocus
                />
              </Question>
            )}

            {step === 2 && (
              <Question eyebrow="Location" title="Where is it?" subtitle="City or neighborhood is enough for now.">
                <BigInput value={city} onChange={setCity} placeholder="Brooklyn, NY" autoFocus />
              </Question>
            )}

            {step === 3 && (
              <Question eyebrow="Cuisine" title="What kind of food do you serve?" subtitle="Pick one — you can change it later.">
                <div className="flex flex-wrap gap-2">
                  {CUISINES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCuisine(c)}
                      className={`rounded-full px-4 py-2 text-sm border transition-colors ${
                        cuisine === c
                          ? "bg-emerald-500 text-slate-950 border-emerald-400"
                          : "border-slate-700 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </Question>
            )}

            {step === 4 && (
              <Question
                eyebrow="Capacity"
                title="About how many seats do you have?"
                subtitle="We’ll seed a starter table layout from this."
              >
                <BigInput value={seats} onChange={setSeats} placeholder="40" inputMode="numeric" autoFocus />
              </Question>
            )}

            {step === 5 && (
              <Question eyebrow="Hours" title="When are you usually open?" subtitle="A starting point for your booking page.">
                <div className="space-y-2">
                  {HOUR_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setHoursId(p.id)}
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
                        hoursId === p.id
                          ? "border-emerald-400 bg-emerald-500/10"
                          : "border-slate-800 hover:border-slate-600"
                      }`}
                    >
                      <div className="font-medium">{p.label}</div>
                      <div className="text-sm text-slate-400">{p.hint}</div>
                    </button>
                  ))}
                </div>
              </Question>
            )}

            {step === 6 && (
              <Question eyebrow="Brand" title="Pick a brand color" subtitle="Used on your public booking page.">
                <div className="flex flex-wrap gap-3">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setBrand(c)}
                      className={`size-12 rounded-full border-2 ${
                        brand === c ? "border-white scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={c}
                    />
                  ))}
                </div>
              </Question>
            )}

            {step === 7 && (
              <Question
                eyebrow="Menu"
                title="Add a few signature dishes?"
                subtitle="One per line. Optional — skip if you want."
              >
                <textarea
                  value={menuText}
                  onChange={(e) => setMenuText(e.target.value)}
                  rows={5}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  placeholder={"Margherita Pizza\nHouse Salad\nTiramisu"}
                  autoFocus
                />
              </Question>
            )}

            {step === 8 && (
              <Question
                eyebrow="You’re ready"
                title="Your booking page is live."
                subtitle="Share this link with guests — or open the dashboard to keep building."
              >
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <div className="text-xs text-slate-500 mb-1">Public booking URL</div>
                  <div className="font-mono text-sm text-emerald-300 break-all">{bookingUrl || "Creating…"}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!bookingUrl}
                      onClick={async () => {
                        await navigator.clipboard.writeText(bookingUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs"
                    >
                      <Copy className="size-3.5" /> {copied ? "Copied" : "Copy link"}
                    </button>
                    {bookingUrl && (
                      <a
                        href={bookingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs"
                      >
                        <ExternalLink className="size-3.5" /> Open page
                      </a>
                    )}
                  </div>
                </div>
              </Question>
            )}
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pb-6">
          <button
            type="button"
            disabled={busy || step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800 px-4 py-2.5 text-sm text-slate-300 disabled:opacity-30"
          >
            <ArrowLeft className="size-4" /> Back
          </button>

          <div className="flex items-center gap-2">
            {step === 7 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setMenuText("");
                  void next();
                }}
                className="rounded-xl px-4 py-2.5 text-sm text-slate-400 hover:text-slate-200"
              >
                Skip
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => void next()}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {step === 8 ? (
                <>
                  <Check className="size-4" /> Open dashboard
                </>
              ) : (
                <>
                  OK <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {step < 8 && (
          <p className="text-center text-[11px] text-slate-600 pb-4">Press Enter ↵ to continue</p>
        )}
      </div>
    </div>
  );
}

function Question({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400/90">{eyebrow}</div>
      <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-white leading-tight">{title}</h1>
      <p className="mt-3 text-slate-400">{subtitle}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}

function BigInput({
  value,
  onChange,
  placeholder,
  autoFocus,
  inputMode,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  inputMode?: "text" | "numeric";
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      inputMode={inputMode}
      className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-4 text-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
    />
  );
}
