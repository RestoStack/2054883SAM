import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { clearSelectedPlan, readSelectedPlan } from "@/lib/plans";
import { DEFAULT_HOURS, DAYS, type WeekHours } from "@/components/onboarding/HoursEditor";

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
  brand_accent: string | null;
  booking_headline: string | null;
  booking_welcome: string | null;
  hours: WeekHours | null;
  google_business_url: string | null;
  seating_plan_url: string | null;
  custom_domain: string | null;
  menu_source_url: string | null;
  integrations: string[] | null;
  onboarding_completed_at: string | null;
};

type StaffDraft = {
  id: string;
  full_name: string;
  role: "hostess" | "server" | "admin";
  hourly_wage: string;
};

type CustomerDraft = { full_name: string; email: string; phone: string };

const CUISINES = ["Italian", "American", "Japanese", "Mexican", "Café", "Seafood", "Steakhouse", "Other"];
const COLORS = ["#059669", "#0f766e", "#1d4ed8", "#7c3aed", "#be123c", "#c2410c", "#171717"];
const TOOLS = [
  "Toast",
  "Square",
  "OpenTable",
  "Resy",
  "DoorDash",
  "Uber Eats",
  "Google Reserve",
  "Mailchimp",
  "Stripe",
  "QuickBooks",
];
const BOOKING_FLASH_STEPS = [
  { id: "headline", title: "Headline", hint: "The first words guests see" },
  { id: "welcome", title: "Welcome note", hint: "Short reassurance under the headline" },
  { id: "color", title: "Brand color", hint: "Buttons & accents on the booking page" },
  { id: "flow", title: "Guest journey", hint: "Date → party size → time → details → confirm" },
];

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

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseMenuLines(text: string) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 40)
    .map((line, i) => {
      const m = line.match(/^(.*?)[\s\-–—]+\$?\s*(\d+(?:\.\d{1,2})?)\s*$/);
      if (m) return { name: m[1].trim(), price: Number(m[2]) };
      return { name: line.replace(/^[-*•]\s*/, ""), price: 16 + (i % 6) * 2 };
    });
}

function parseCustomerCsv(text: string): CustomerDraft[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^name[,;\t]/i.test(l))
    .map((line) => {
      const parts = line.split(/[,;\t]/).map((p) => p.trim().replace(/^"|"$/g, ""));
      const [full_name = "", email = "", phone = ""] = parts;
      return { full_name, email, phone };
    })
    .filter((r) => r.full_name);
}

async function uploadMedia(restaurantId: string, file: File, kind: string) {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `${restaurantId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("restaurant-media").upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });
  if (error) throw error;
  return supabase.storage.from("restaurant-media").getPublicUrl(path).data.publicUrl;
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
  const [seatingMode, setSeatingMode] = useState<"create" | "upload">("create");
  const [tablePreset, setTablePreset] = useState<"small" | "medium" | "large">("medium");
  const [seatingPreview, setSeatingPreview] = useState<string | null>(null);
  const [hoursId, setHoursId] = useState("dinner");
  const [gmbUrl, setGmbUrl] = useState("");
  const [menuUrl, setMenuUrl] = useState("");
  const [menuText, setMenuText] = useState("Margherita Pizza — 18\nHouse Salad — 14\nTiramisu — 12");
  const [menuFileUrl, setMenuFileUrl] = useState<string | null>(null);
  const [brand, setBrand] = useState(COLORS[0]);
  const [headline, setHeadline] = useState("");
  const [welcome, setWelcome] = useState("");
  const [flashIdx, setFlashIdx] = useState(0);
  const [staffRows, setStaffRows] = useState<StaffDraft[]>([
    { id: crypto.randomUUID(), full_name: "", role: "hostess", hourly_wage: "18" },
    { id: crypto.randomUUID(), full_name: "", role: "server", hourly_wage: "16" },
  ]);
  const [tools, setTools] = useState<string[]>([]);
  const [domain, setDomain] = useState("");
  const [customerText, setCustomerText] = useState("Full Name,email@example.com,555-0100");
  const [copied, setCopied] = useState(false);
  const seatingInputRef = useRef<HTMLInputElement>(null);
  const menuInputRef = useRef<HTMLInputElement>(null);

  const STEPS = [
    "Welcome",
    "Restaurant",
    "Location",
    "Cuisine",
    "Seating",
    "Hours",
    "Google Business",
    "Menu",
    "Booking page",
    "Employees",
    "Integrations",
    "Domain",
    "Customers",
    "Ready",
  ] as const;
  const totalSteps = STEPS.length;
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
        .select(
          "id,name,slug,city,cuisine,brand_primary,brand_accent,booking_headline,booking_welcome,hours,google_business_url,seating_plan_url,custom_domain,menu_source_url,integrations,onboarding_completed_at",
        )
        .eq("id", staff.restaurant_id)
        .maybeSingle();
      if (data) {
        const r = data as unknown as Restaurant;
        setRestaurant(r);
        setRestaurantName(r.name || "");
        setCity(r.city || "");
        setCuisine(r.cuisine || "Italian");
        setBrand(r.brand_primary || COLORS[0]);
        setHeadline(r.booking_headline || "");
        setWelcome(r.booking_welcome || "");
        setGmbUrl(r.google_business_url || "");
        setSeatingPreview(r.seating_plan_url);
        setDomain(r.custom_domain || "");
        setMenuUrl(r.menu_source_url || "");
        setTools(Array.isArray(r.integrations) ? r.integrations : []);
      }
      if (staff.full_name) setFullName((v) => v || staff.full_name);
    })();
  }, [loading, session, staff, navigate]);

  useEffect(() => {
    if (step !== 8) return;
    const t = window.setInterval(() => {
      setFlashIdx((i) => (i + 1) % BOOKING_FLASH_STEPS.length);
    }, 1600);
    return () => window.clearInterval(t);
  }, [step]);

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
    });
    if (rpcErr) {
      if (/already has a restaurant/i.test(rpcErr.message)) {
        await refreshStaff();
        throw new Error("Restaurant already linked — please continue.");
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
      .select(
        "id,name,slug,city,cuisine,brand_primary,brand_accent,booking_headline,booking_welcome,hours,google_business_url,seating_plan_url,custom_domain,menu_source_url,integrations,onboarding_completed_at",
      )
      .eq("id", id)
      .maybeSingle();
    const created = r as unknown as Restaurant;
    setRestaurant(created);
    return created;
  };

  const seedTables = async (r: Restaurant) => {
    const { count } = await supabase
      .from("v2_tables")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", r.id);
    if (count) return;
    const packs =
      tablePreset === "small"
        ? { twos: 4, fours: 3 }
        : tablePreset === "large"
          ? { twos: 10, fours: 12 }
          : { twos: 6, fours: 8 };
    const rows = [
      ...Array.from({ length: packs.twos }, (_, i) => ({
        restaurant_id: r.id,
        table_number: `T${i + 1}`,
        capacity: 2,
        section: "Main Floor",
        shape: "square" as const,
        status: "available" as const,
      })),
      ...Array.from({ length: packs.fours }, (_, i) => ({
        restaurant_id: r.id,
        table_number: `B${i + 1}`,
        capacity: 4,
        section: i % 3 === 0 ? "Patio" : "Main Floor",
        shape: "rectangle" as const,
        status: "available" as const,
      })),
    ];
    await supabase.from("v2_tables").insert(rows as never);
  };

  const next = async (opts?: { skip?: boolean }) => {
    setError(null);
    setBusy(true);
    try {
      if (step === 0) {
        if (!fullName.trim()) throw new Error("Tell us your name to continue.");
        if (staff) await supabase.from("v2_users").update({ full_name: fullName.trim() }).eq("id", staff.id);
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
        if (seatingMode === "create") {
          await seedTables(r);
        } else if (!seatingPreview && !opts?.skip) {
          throw new Error("Upload a seating screenshot, or switch to Create seating.");
        }
        if (seatingPreview) {
          await supabase.from("v2_restaurants").update({ seating_plan_url: seatingPreview }).eq("id", r.id);
          setRestaurant({ ...r, seating_plan_url: seatingPreview });
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
        if (!opts?.skip && gmbUrl.trim()) {
          await supabase
            .from("v2_restaurants")
            .update({ google_business_url: gmbUrl.trim() })
            .eq("id", r.id);
          setRestaurant({ ...r, google_business_url: gmbUrl.trim() });
        }
        setStep(7);
      } else if (step === 7) {
        const r = restaurant ?? (await ensureRestaurant());
        const items = parseMenuLines(menuText);
        if (!opts?.skip && items.length) {
          const { data: existingCats } = await supabase
            .from("v2_menu_categories")
            .select("id")
            .eq("restaurant_id", r.id)
            .limit(1);
          let catId = existingCats?.[0]?.id;
          if (!catId) {
            const { data: cat } = await supabase
              .from("v2_menu_categories")
              .insert({ restaurant_id: r.id, name: "Menu", sort_order: 0 } as never)
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
                items.map((it) => ({
                  restaurant_id: r.id,
                  category_id: catId,
                  name: it.name,
                  price: it.price,
                  is_available: true,
                })) as never,
              );
            }
          }
        }
        await supabase
          .from("v2_restaurants")
          .update({
            menu_source_url: menuUrl.trim() || menuFileUrl,
          } as never)
          .eq("id", r.id);
        if (!headline) setHeadline(`Reserve a table at ${r.name}`);
        if (!welcome) setWelcome(`Welcome to ${r.name}. Book in a few taps.`);
        setStep(8);
      } else if (step === 8) {
        const r = restaurant ?? (await ensureRestaurant());
        const h = headline.trim() || `Reserve a table at ${r.name}`;
        const w = welcome.trim() || `Welcome to ${r.name}. Book in a few taps.`;
        await supabase
          .from("v2_restaurants")
          .update({
            brand_primary: brand,
            brand_accent: brand,
            booking_headline: h,
            booking_welcome: w,
          })
          .eq("id", r.id);
        setRestaurant({
          ...r,
          brand_primary: brand,
          brand_accent: brand,
          booking_headline: h,
          booking_welcome: w,
        });
        setStep(9);
      } else if (step === 9) {
        const r = restaurant ?? (await ensureRestaurant());
        const rows = staffRows
          .map((s) => ({
            ...s,
            full_name: s.full_name.trim(),
            hourly_wage: Number(s.hourly_wage) || null,
          }))
          .filter((s) => s.full_name);
        if (!opts?.skip && rows.length) {
          await supabase.from("v2_users").insert(
            rows.map((s) => ({
              restaurant_id: r.id,
              full_name: s.full_name,
              role: s.role,
              hourly_wage: s.hourly_wage,
              is_active: true,
              pin: String(1000 + Math.floor(Math.random() * 8999)),
            })) as never,
          );
        }
        setStep(10);
      } else if (step === 10) {
        const r = restaurant ?? (await ensureRestaurant());
        await supabase
          .from("v2_restaurants")
          .update({ integrations: tools } as never)
          .eq("id", r.id);
        setRestaurant({ ...r, integrations: tools });
        setStep(11);
      } else if (step === 11) {
        const r = restaurant ?? (await ensureRestaurant());
        if (!opts?.skip && domain.trim()) {
          await supabase
            .from("v2_restaurants")
            .update({ custom_domain: domain.trim().toLowerCase() })
            .eq("id", r.id);
          setRestaurant({ ...r, custom_domain: domain.trim().toLowerCase() });
        }
        setStep(12);
      } else if (step === 12) {
        const r = restaurant ?? (await ensureRestaurant());
        const customers = parseCustomerCsv(customerText);
        if (!opts?.skip && customers.length) {
          await supabase.from("v2_customers").insert(
            customers.slice(0, 500).map((c) => ({
              restaurant_id: r.id,
              full_name: c.full_name,
              email: c.email || null,
              phone: c.phone || null,
            })) as never,
          );
        }
        setStep(13);
      } else if (step === 13) {
        const r = restaurant ?? (await ensureRestaurant());
        await supabase
          .from("v2_restaurants")
          .update({ onboarding_completed_at: new Date().toISOString() })
          .eq("id", r.id);
        await refreshStaff();
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (e) {
      setError((e as Error).message || "Could not continue.");
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && ![7, 9, 12].includes(step)) {
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
        <div className="h-full bg-emerald-400 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>

      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 min-h-[calc(100vh-4px)] flex flex-col">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>RestoStack setup</span>
          <span>
            {STEPS[step]} · {step + 1}/{totalSteps}
          </span>
        </div>

        <div className="flex-1 flex flex-col justify-center py-8">
          <div key={step} className="space-y-6">
            {step === 0 && (
              <Question eyebrow="Welcome" title="First — what’s your name?" subtitle="Owner profile for your restaurant.">
                <BigInput value={fullName} onChange={setFullName} placeholder="Alex Morgan" autoFocus />
              </Question>
            )}

            {step === 1 && (
              <Question eyebrow="Restaurant" title="What’s your restaurant called?" subtitle="This powers your public booking page.">
                <BigInput value={restaurantName} onChange={setRestaurantName} placeholder="Nonna’s Kitchen" autoFocus />
              </Question>
            )}

            {step === 2 && (
              <Question eyebrow="Location" title="Where is it?" subtitle="City or neighborhood is enough for now.">
                <BigInput value={city} onChange={setCity} placeholder="Brooklyn, NY" autoFocus />
              </Question>
            )}

            {step === 3 && (
              <Question eyebrow="Cuisine" title="What kind of food do you serve?" subtitle="Pick one — editable later.">
                <ChipRow options={CUISINES} value={cuisine} onChange={setCuisine} />
              </Question>
            )}

            {step === 4 && (
              <Question
                eyebrow="Seating"
                title="Create your seating — or upload what you already use"
                subtitle="Quick-add a layout, or drop a screenshot from OpenTable, Resy, Toast, etc."
              >
                <div className="flex gap-2 mb-4">
                  {(
                    [
                      ["create", "Create seating"],
                      ["upload", "Upload screenshot"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSeatingMode(id)}
                      className={`rounded-full px-4 py-2 text-sm border ${
                        seatingMode === id
                          ? "bg-emerald-500 text-slate-950 border-emerald-400"
                          : "border-slate-700 text-slate-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {seatingMode === "create" ? (
                  <div className="space-y-2">
                    {(
                      [
                        ["small", "Intimate", "~14 seats"],
                        ["medium", "Neighborhood", "~40 seats"],
                        ["large", "Busy room", "~80 seats"],
                      ] as const
                    ).map(([id, label, hint]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setTablePreset(id)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left ${
                          tablePreset === id ? "border-emerald-400 bg-emerald-500/10" : "border-slate-800"
                        }`}
                      >
                        <div className="font-medium">{label}</div>
                        <div className="text-sm text-slate-400">{hint}</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => seatingInputRef.current?.click()}
                      className="w-full rounded-2xl border border-dashed border-slate-700 px-4 py-10 text-center hover:border-emerald-400/60"
                    >
                      <Upload className="size-5 mx-auto mb-2 text-emerald-400" />
                      <div className="text-sm">Upload seating screenshot</div>
                      <div className="text-xs text-slate-500 mt-1">PNG/JPG up to 5MB</div>
                    </button>
                    <input
                      ref={seatingInputRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (!file) return;
                        setBusy(true);
                        try {
                          const r = restaurant ?? (await ensureRestaurant());
                          const url = await uploadMedia(r.id, file, "seating");
                          setSeatingPreview(url);
                        } catch (err) {
                          setError((err as Error).message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    />
                    {seatingPreview && (
                      <img src={seatingPreview} alt="Seating plan" className="rounded-xl border border-slate-800 max-h-56 w-full object-cover" />
                    )}
                  </div>
                )}
              </Question>
            )}

            {step === 5 && (
              <Question eyebrow="Hours" title="When are you usually open?" subtitle="Guests see this on your booking page.">
                <div className="space-y-2">
                  {HOUR_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setHoursId(p.id)}
                      className={`w-full rounded-2xl border px-4 py-4 text-left ${
                        hoursId === p.id ? "border-emerald-400 bg-emerald-500/10" : "border-slate-800"
                      }`}
                    >
                      <div className="font-medium">{p.label}</div>
                      <div className="text-sm text-slate-400">{p.hint}</div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  Days covered: {DAYS.map((d) => d.label.slice(0, 3)).join(" · ")}
                </p>
              </Question>
            )}

            {step === 6 && (
              <Question
                eyebrow="Google Business"
                title="Link your Google Business profile"
                subtitle="Paste your Google Maps / Business URL so guests find the same place."
              >
                <BigInput
                  value={gmbUrl}
                  onChange={setGmbUrl}
                  placeholder="https://maps.google.com/… or https://g.page/…"
                  autoFocus
                />
              </Question>
            )}

            {step === 7 && (
              <Question
                eyebrow="Menu"
                title="Upload a menu, or give us a link"
                subtitle="Paste a menu URL and/or dish list — we’ll autopopulate items you can edit."
              >
                <div className="space-y-3">
                  <BigInput value={menuUrl} onChange={setMenuUrl} placeholder="https://yoursite.com/menu" />
                  <button
                    type="button"
                    onClick={() => menuInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm"
                  >
                    <Upload className="size-4" /> Upload menu image/PDF
                  </button>
                  <input
                    ref={menuInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    hidden
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      setBusy(true);
                      try {
                        const r = restaurant ?? (await ensureRestaurant());
                        const url = await uploadMedia(r.id, file, "menu");
                        setMenuFileUrl(url);
                      } catch (err) {
                        setError((err as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  />
                  {menuFileUrl && <p className="text-xs text-emerald-400">Uploaded: {menuFileUrl}</p>}
                  <textarea
                    value={menuText}
                    onChange={(e) => setMenuText(e.target.value)}
                    rows={6}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    placeholder={"Dish — 18\nAnother dish — 22"}
                  />
                  <p className="text-xs text-slate-500">
                    Tip: one dish per line. Add a price after a dash like `Pasta — 19`.
                  </p>
                </div>
              </Question>
            )}

            {step === 8 && (
              <Question
                eyebrow="Booking page"
                title="Customize the guest booking experience"
                subtitle="We’ll walk through each part of your public booking page."
              >
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 mb-4">
                  <div className="text-xs text-slate-500 mb-1">Your booking link</div>
                  <div className="font-mono text-sm text-emerald-300 break-all">{bookingUrl || "Creating…"}</div>
                </div>

                <div className="space-y-2 mb-5">
                  {BOOKING_FLASH_STEPS.map((s, i) => {
                    const active = i === flashIdx;
                    return (
                      <div
                        key={s.id}
                        className={`rounded-xl border px-4 py-3 transition-all duration-500 ${
                          active
                            ? "border-emerald-400 bg-emerald-500/15 shadow-[0_0_24px_rgba(52,211,153,0.25)] scale-[1.02]"
                            : "border-slate-800 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`size-2 rounded-full ${active ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`}
                          />
                          <span className="font-medium text-sm">{s.title}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1 pl-4">{s.hint}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-3">
                  <label className="block">
                    <span className="text-xs text-slate-500">Headline</span>
                    <input
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm"
                      placeholder="Reserve a table tonight"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-slate-500">Welcome sentence</span>
                    <input
                      value={welcome}
                      onChange={(e) => setWelcome(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm"
                      placeholder="Book in seconds — we’ll take care of the rest."
                    />
                  </label>
                  <div>
                    <div className="text-xs text-slate-500 mb-2">Brand color</div>
                    <div className="flex flex-wrap gap-2">
                      {COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setBrand(c)}
                          className={`size-10 rounded-full border-2 ${brand === c ? "border-white scale-110" : "border-transparent"}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </Question>
            )}

            {step === 9 && (
              <Question
                eyebrow="Employees"
                title="Add your team (with hourly pay)"
                subtitle="Hostesses, servers, admins — you can invite more later."
              >
                <div className="space-y-3">
                  {staffRows.map((row) => (
                    <div key={row.id} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_100px_36px] gap-2">
                      <input
                        value={row.full_name}
                        onChange={(e) =>
                          setStaffRows((rows) =>
                            rows.map((r) => (r.id === row.id ? { ...r, full_name: e.target.value } : r)),
                          )
                        }
                        placeholder="Full name"
                        className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm"
                      />
                      <select
                        value={row.role}
                        onChange={(e) =>
                          setStaffRows((rows) =>
                            rows.map((r) =>
                              r.id === row.id
                                ? { ...r, role: e.target.value as StaffDraft["role"] }
                                : r,
                            ),
                          )
                        }
                        className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm"
                      >
                        <option value="hostess">Hostess</option>
                        <option value="server">Server</option>
                        <option value="admin">Admin</option>
                      </select>
                      <input
                        value={row.hourly_wage}
                        onChange={(e) =>
                          setStaffRows((rows) =>
                            rows.map((r) =>
                              r.id === row.id ? { ...r, hourly_wage: e.target.value.replace(/[^\d.]/g, "") } : r,
                            ),
                          )
                        }
                        placeholder="$/hr"
                        className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setStaffRows((rows) => rows.filter((r) => r.id !== row.id))}
                        className="rounded-xl border border-slate-800 grid place-items-center text-slate-400"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setStaffRows((rows) => [
                        ...rows,
                        { id: crypto.randomUUID(), full_name: "", role: "server", hourly_wage: "16" },
                      ])
                    }
                    className="inline-flex items-center gap-2 text-sm text-emerald-400"
                  >
                    <Plus className="size-4" /> Add employee
                  </button>
                </div>
              </Question>
            )}

            {step === 10 && (
              <Question
                eyebrow="Integrations"
                title="Which tools do you already use?"
                subtitle="We’ll prioritize these connections next. Nothing is charged here."
              >
                <div className="flex flex-wrap gap-2">
                  {TOOLS.map((t) => {
                    const on = tools.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() =>
                          setTools((prev) => (on ? prev.filter((x) => x !== t) : [...prev, t]))
                        }
                        className={`rounded-full px-4 py-2 text-sm border ${
                          on
                            ? "bg-emerald-500 text-slate-950 border-emerald-400"
                            : "border-slate-700 text-slate-300"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </Question>
            )}

            {step === 11 && (
              <Question
                eyebrow="Domain"
                title="Connect a custom domain"
                subtitle="Optional — skip and use your RestoStack booking link for now."
              >
                <BigInput
                  value={domain}
                  onChange={setDomain}
                  placeholder="book.yourrestaurant.com"
                  autoFocus
                />
                <p className="text-xs text-slate-500 mt-2 inline-flex items-center gap-1">
                  <Link2 className="size-3.5" /> DNS setup can be finished later in Settings.
                </p>
              </Question>
            )}

            {step === 12 && (
              <Question
                eyebrow="Customers"
                title="Upload your old customer list"
                subtitle="Paste CSV rows: Name, Email, Phone — or skip and start fresh."
              >
                <textarea
                  value={customerText}
                  onChange={(e) => setCustomerText(e.target.value)}
                  rows={7}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
                <p className="text-xs text-slate-500 mt-2">
                  We’ll import up to 500 guests into your restaurant CRM.
                </p>
              </Question>
            )}

            {step === 13 && (
              <Question
                eyebrow="You’re ready"
                title="Your restaurant is ready from scratch."
                subtitle="Share the booking link, invite the team, and keep polishing in the dashboard."
              >
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium mb-2">
                    <Sparkles className="size-4" /> Public booking page
                  </div>
                  <div className="font-mono text-sm text-emerald-300 break-all">{bookingUrl}</div>
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
            {[6, 7, 9, 11, 12].includes(step) && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void next({ skip: true })}
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
              {step === 13 ? (
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

        {step < 13 && (
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
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-4 text-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
    />
  );
}

function ChipRow({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`rounded-full px-4 py-2 text-sm border ${
            value === c
              ? "bg-emerald-500 text-slate-950 border-emerald-400"
              : "border-slate-700 text-slate-300 hover:border-slate-500"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
