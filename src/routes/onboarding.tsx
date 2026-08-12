import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  ArrowRight, ArrowLeft, Loader2, Check, Copy, ExternalLink, Sparkles,
  Upload, Trash2, Plus, MapPin, Utensils, Clock, Globe, Users, Puzzle, Link2, Database,
} from "lucide-react";
import { DEFAULT_HOURS, DAYS, type WeekHours } from "@/components/onboarding/HoursEditor";
import { TablesQuickAdd } from "@/components/onboarding/TablesQuickAdd";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Get set up — RestoStack" }] }),
  component: OnboardingPage,
});

const CUISINES = [
  "Italian", "American", "Japanese", "Mexican", "French", "Indian",
  "Chinese", "Thai", "Mediterranean", "Steakhouse", "Cafe", "Wine bar", "Vegan",
];

const COLORS = [
  { name: "Emerald", value: "#059669", accent: "#10b981" },
  { name: "Rose", value: "#e11d48", accent: "#f43f5e" },
  { name: "Amber", value: "#d97706", accent: "#f59e0b" },
  { name: "Indigo", value: "#4f46e5", accent: "#6366f1" },
  { name: "Slate", value: "#0f172a", accent: "#334155" },
  { name: "Rust", value: "#9a3412", accent: "#c2410c" },
];

const HOURS_PRESETS: { label: string; hours: WeekHours }[] = [
  { label: "Every day 11am – 10pm", hours: Object.fromEntries(DAYS.map((d) => [d.key, { open: "11:00", close: "22:00", closed: false }])) },
  { label: "Dinner only 5pm – 11pm", hours: Object.fromEntries(DAYS.map((d) => [d.key, { open: "17:00", close: "23:00", closed: false }])) },
  { label: "Cafe 8am – 4pm", hours: Object.fromEntries(DAYS.map((d) => [d.key, { open: "08:00", close: "16:00", closed: false }])) },
  { label: "Closed Mondays, else 11–10", hours: Object.fromEntries(DAYS.map((d) => [d.key, d.key === "mon" ? { open: "11:00", close: "22:00", closed: true } : { open: "11:00", close: "22:00", closed: false }])) },
];

const INTEGRATIONS = [
  "Toast", "Square", "OpenTable", "Resy", "DoorDash", "Uber Eats",
  "Google Reserve", "Mailchimp", "Stripe", "QuickBooks",
];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const TOTAL = 14;

type StaffDraft = { id: string; name: string; role: "hostess" | "server" | "admin"; wage: string };
type MenuDraft = { name: string; price: string; description: string };
type CustDraft = { name: string; email: string; phone: string };

function OnboardingPage() {
  const { session, staff, loading, refreshStaff } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  // Data
  const [fullName, setFullName] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [city, setCity] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [seatingUrl, setSeatingUrl] = useState<string | null>(null);
  const [seatingBusy, setSeatingBusy] = useState(false);
  const [hoursIdx, setHoursIdx] = useState(0);
  const [gbUrl, setGbUrl] = useState("");
  const [menuUrl, setMenuUrl] = useState("");
  const [menuPasted, setMenuPasted] = useState("");
  const [menuFileUrl, setMenuFileUrl] = useState<string | null>(null);
  const [menuBusy, setMenuBusy] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuDraft[]>([]);
  const [colorIdx, setColorIdx] = useState(0);
  const [bookingHeadline, setBookingHeadline] = useState("");
  const [bookingWelcome, setBookingWelcome] = useState("");
  const [staffDrafts, setStaffDrafts] = useState<StaffDraft[]>([]);
  const [integrations, setIntegrations] = useState<string[]>([]);
  const [customDomain, setCustomDomain] = useState("");
  const [customerPaste, setCustomerPaste] = useState("");
  const [customerDrafts, setCustomerDrafts] = useState<CustDraft[]>([]);

  const [slug, setSlug] = useState<string | null>(null);
  const restaurantIdRef = useRef<string | null>(null);
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!session) { navigate({ to: "/login", replace: true }); return; }
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    (async () => {
      const meta = (session.user.user_metadata as any) ?? {};
      const seedName = meta.full_name || meta.name || (session.user.email ?? "").split("@")[0];
      setFullName(seedName ?? "");
      if (staff) {
        restaurantIdRef.current = staff.restaurant_id;
        const { data: r } = await supabase
          .from("v2_restaurants")
          .select("*")
          .eq("id", staff.restaurant_id)
          .maybeSingle();
        if (r) {
          const anyR = r as any;
          setRestaurantName(anyR.name ?? "");
          setSlug(anyR.slug ?? null);
          setCity(anyR.city ?? "");
          setCuisine(anyR.cuisine ?? "");
          setSeatingUrl(anyR.seating_plan_url ?? null);
          setGbUrl(anyR.google_business_url ?? "");
          setMenuUrl(anyR.menu_source_url ?? "");
          setBookingHeadline(anyR.booking_headline ?? "");
          setBookingWelcome(anyR.booking_welcome ?? "");
          setCustomDomain(anyR.custom_domain ?? "");
          if (Array.isArray(anyR.integrations)) setIntegrations(anyR.integrations);
          if (anyR.onboarding_completed_at) {
            navigate({ to: "/dashboard", replace: true });
            return;
          }
        }
        setFullName(staff.full_name || seedName || "");
      }
    })();
  }, [loading, session, staff, navigate]);

  const ensureRestaurant = async (): Promise<string | null> => {
    if (restaurantIdRef.current) return restaurantIdRef.current;
    if (!restaurantName.trim()) return null;
    const plan = (typeof window !== "undefined" && sessionStorage.getItem("restostack:plan")) || "starter";
    const { data, error } = await (supabase.rpc as any)("v2_signup_create_restaurant", {
      _restaurant_name: restaurantName.trim(),
      _slug: slugify(restaurantName),
      _city: city,
      _full_name: fullName,
      _plan: plan,
    });
    if (error) { toast.error(error.message); return null; }
    const row = Array.isArray(data) ? data[0] : data;
    const id = (row?.out_restaurant_id ?? row?.id) as string;
    const s = (row?.out_slug ?? row?.slug) as string;
    restaurantIdRef.current = id;
    setSlug(s);
    await refreshStaff();
    return id;
  };

  const uploadTo = async (file: File, prefix: string): Promise<string | null> => {
    const id = restaurantIdRef.current;
    if (!id) { toast.error("Save restaurant name first"); return null; }
    if (file.size > 10 * 1024 * 1024) { toast.error("File must be under 10 MB"); return null; }
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `${id}/${prefix}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("restaurant-media").upload(path, file, {
      contentType: file.type, upsert: true,
    });
    if (error) { toast.error(error.message); return null; }
    return supabase.storage.from("restaurant-media").getPublicUrl(path).data.publicUrl;
  };

  const parseMenuText = (text: string): MenuDraft[] => {
    const out: MenuDraft[] = [];
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      // Match patterns like "Name - Description - $12.50" or "Name $12.50" or "Name — 12"
      const m = line.match(/^(.+?)\s*[-–—]\s*(.+?)\s*[-–—]?\s*\$?(\d+(?:\.\d{1,2})?)\s*$/)
             || line.match(/^(.+?)\s+\$?(\d+(?:\.\d{1,2})?)\s*$/);
      if (m) {
        if (m.length === 4) out.push({ name: m[1].trim(), description: m[2].trim(), price: m[3] });
        else out.push({ name: m[1].trim(), description: "", price: m[2] });
      } else {
        out.push({ name: line, description: "", price: "" });
      }
    }
    return out.slice(0, 60);
  };

  const parseCustomerText = (text: string): CustDraft[] => {
    const out: CustDraft[] = [];
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      const parts = line.split(/[,\t]/).map((p) => p.trim());
      const [name, email, phone] = [parts[0] ?? "", parts[1] ?? "", parts[2] ?? ""];
      if (!name && !email && !phone) continue;
      out.push({ name, email, phone });
    }
    return out.slice(0, 2000);
  };

  const next = async () => {
    setBusy(true);
    try {
      if (step === 1) {
        if (!fullName.trim()) { toast.error("Please enter your name"); return; }
        if (staff) await supabase.from("v2_users").update({ full_name: fullName.trim() }).eq("id", staff.id);
      }
      if (step === 2) {
        if (!restaurantName.trim()) { toast.error("Restaurant name is required"); return; }
        if (restaurantIdRef.current) {
          await supabase.from("v2_restaurants").update({ name: restaurantName.trim() }).eq("id", restaurantIdRef.current);
        }
      }
      if (step === 3) {
        const id = await ensureRestaurant();
        if (!id) return;
        await supabase.from("v2_restaurants").update({ city: city || null }).eq("id", id);
      }
      if (step === 4) {
        const id = await ensureRestaurant();
        if (id) await supabase.from("v2_restaurants").update({ cuisine: cuisine || null }).eq("id", id);
      }
      if (step === 6) {
        const id = await ensureRestaurant();
        if (id) await supabase.from("v2_restaurants").update({ hours: HOURS_PRESETS[hoursIdx].hours as any }).eq("id", id);
      }
      if (step === 7) {
        const id = await ensureRestaurant();
        if (id) await supabase.from("v2_restaurants").update({ google_business_url: gbUrl.trim() || null } as any).eq("id", id);
      }
      if (step === 8) {
        const id = await ensureRestaurant();
        if (id) {
          await supabase.from("v2_restaurants").update({ menu_source_url: menuUrl.trim() || menuFileUrl || null } as any).eq("id", id);
          const rows = menuItems
            .map((m) => ({ name: m.name.trim(), description: m.description.trim() || null, price: Number(m.price) || 0 }))
            .filter((m) => m.name);
          if (rows.length) {
            const { data: existingCat } = await supabase
              .from("v2_menu_categories").select("id").eq("restaurant_id", id).limit(1).maybeSingle();
            let catId = (existingCat as any)?.id as string | undefined;
            if (!catId) {
              const { data: nc } = await supabase.from("v2_menu_categories")
                .insert({ restaurant_id: id, name: "Menu", sort_order: 0 }).select("id").single();
              catId = (nc as any)?.id;
            }
            if (catId) {
              await supabase.from("v2_menu_items").insert(
                rows.map((r) => ({ restaurant_id: id, category_id: catId!, name: r.name, description: r.description, price: r.price, is_available: true }))
              );
            }
          }
        }
      }
      if (step === 9) {
        const id = await ensureRestaurant();
        const c = COLORS[colorIdx];
        if (id) await supabase.from("v2_restaurants").update({
          brand_primary: c.value, brand_accent: c.accent,
          booking_headline: bookingHeadline.trim() || null,
          booking_welcome: bookingWelcome.trim() || null,
        }).eq("id", id);
      }
      if (step === 10) {
        const id = await ensureRestaurant();
        if (id) {
          const rows = staffDrafts
            .map((s) => ({
              restaurant_id: id, full_name: s.name.trim(), role: s.role,
              hourly_wage: s.wage ? Number(s.wage) : null, is_active: true,
            }))
            .filter((r) => r.full_name);
          if (rows.length) await (supabase.from("v2_users") as any).insert(rows);
        }
      }
      if (step === 11) {
        const id = await ensureRestaurant();
        if (id) await supabase.from("v2_restaurants").update({ integrations } as any).eq("id", id);
      }
      if (step === 12) {
        const id = await ensureRestaurant();
        if (id) await supabase.from("v2_restaurants").update({ custom_domain: customDomain.trim() || null } as any).eq("id", id);
      }
      if (step === 13) {
        const id = await ensureRestaurant();
        if (id) {
          const all = [...customerDrafts, ...parseCustomerText(customerPaste)]
            .map((c) => ({
              restaurant_id: id,
              full_name: c.name.trim() || "Guest",
              email: c.email.trim() || null,
              phone: c.phone.trim() || null,
            }))
            .filter((c) => c.full_name !== "Guest" || c.email || c.phone);
          if (all.length) await supabase.from("v2_customers").insert(all);
        }
      }
      setStep((s) => Math.min(TOTAL, s + 1));
    } catch (e: any) {
      toast.error(e?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const skip = () => setStep((s) => Math.min(TOTAL, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const finish = async () => {
    setBusy(true);
    try {
      const id = await ensureRestaurant();
      if (id) {
        await supabase.from("v2_restaurants")
          .update({ onboarding_completed_at: new Date().toISOString() })
          .eq("id", id);
      }
      try { sessionStorage.removeItem("restostack:plan"); } catch {}
      await refreshStaff();
      navigate({ to: "/dashboard", replace: true });
    } finally { setBusy(false); }
  };

  if (loading || !session) {
    return <div className="min-h-screen grid place-items-center bg-background"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  }

  const canContinue =
    (step === 1 && fullName.trim().length > 0) ||
    (step === 2 && restaurantName.trim().length > 0) ||
    step > 2;

  const skippable = [3, 4, 5, 7, 8, 10, 11, 12, 13].includes(step);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-emerald-50/40">
      <div className="fixed top-0 inset-x-0 h-1 bg-emerald-100 z-10">
        <div className="h-full bg-emerald-600 transition-all duration-500" style={{ width: `${(step / TOTAL) * 100}%` }} />
      </div>
      <div className="fixed top-4 right-6 text-xs text-muted-foreground z-10">{step} of {TOTAL}</div>
      {step > 1 && (
        <button onClick={back} className="fixed top-4 left-6 z-10 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Back
        </button>
      )}

      <main className="mx-auto max-w-3xl px-6 pt-24 pb-16 min-h-screen flex flex-col justify-center">
        <div key={step} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {step === 1 && (
            <QuestionShell index={1} title={`Welcome${fullName ? `, ${fullName.split(" ")[0]}` : ""} 👋`} prompt="What should we call you?" onEnter={next}>
              <BigInput value={fullName} onChange={setFullName} placeholder="Your full name" autoFocus />
            </QuestionShell>
          )}

          {step === 2 && (
            <QuestionShell index={2} title="Your restaurant" prompt="What's it called?" onEnter={next}>
              <BigInput value={restaurantName} onChange={setRestaurantName} placeholder="e.g. Nonna's Kitchen" autoFocus />
            </QuestionShell>
          )}

          {step === 3 && (
            <QuestionShell index={3} title="Location" prompt="Where is it?" icon={<MapPin className="size-5" />} onEnter={next}>
              <BigInput value={city} onChange={setCity} placeholder="City or neighborhood" autoFocus />
            </QuestionShell>
          )}

          {step === 4 && (
            <QuestionShell index={4} title="Cuisine" prompt="What kind of food do you serve?" icon={<Utensils className="size-5" />} onEnter={next}>
              <div className="flex flex-wrap gap-2 mb-4">
                {CUISINES.map((c) => (
                  <button key={c} onClick={() => setCuisine(c)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${cuisine === c ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-border bg-white hover:bg-muted"}`}>
                    {c}
                  </button>
                ))}
              </div>
              <BigInput value={cuisine} onChange={setCuisine} placeholder="Or type your own…" />
            </QuestionShell>
          )}

          {step === 5 && (
            <QuestionShell index={5} title="Seating" prompt="Set up tables now, or upload a screenshot of your current seating.">
              {restaurantIdRef.current ? (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-border bg-white p-5">
                    <div className="text-xs font-semibold uppercase text-muted-foreground mb-3">Option A — Quick add tables</div>
                    <TablesQuickAdd restaurantId={restaurantIdRef.current} />
                  </div>
                  <div className="rounded-2xl border border-border bg-white p-5">
                    <div className="text-xs font-semibold uppercase text-muted-foreground mb-3">Option B — Upload a floorplan / seating screenshot</div>
                    {seatingUrl ? (
                      <div className="flex items-start gap-3">
                        <img src={seatingUrl} alt="Seating" className="h-32 w-auto rounded-lg border border-border" />
                        <button onClick={async () => {
                          await supabase.from("v2_restaurants").update({ seating_plan_url: null } as any).eq("id", restaurantIdRef.current!);
                          setSeatingUrl(null);
                        }} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
                          <Trash2 className="size-3.5" /> Remove
                        </button>
                      </div>
                    ) : (
                      <label className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border bg-background px-4 py-3 text-sm cursor-pointer hover:bg-muted">
                        {seatingBusy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                        Upload image (PNG, JPG)
                        <input type="file" accept="image/*" hidden onChange={async (e) => {
                          const f = e.target.files?.[0]; e.target.value = "";
                          if (!f) return; setSeatingBusy(true);
                          const url = await uploadTo(f, "seating");
                          if (url) {
                            await supabase.from("v2_restaurants").update({ seating_plan_url: url } as any).eq("id", restaurantIdRef.current!);
                            setSeatingUrl(url);
                          }
                          setSeatingBusy(false);
                        }} />
                      </label>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Finish the previous steps first.</p>
              )}
            </QuestionShell>
          )}

          {step === 6 && (
            <QuestionShell index={6} title="Hours of operation" prompt="Pick a preset — you can fine-tune each day later." icon={<Clock className="size-5" />}>
              <div className="grid grid-cols-1 gap-2">
                {HOURS_PRESETS.map((p, i) => (
                  <button key={p.label} onClick={() => setHoursIdx(i)}
                    className={`rounded-xl border px-4 py-3 text-left transition ${hoursIdx === i ? "border-emerald-600 bg-emerald-50" : "border-border bg-white hover:bg-muted"}`}>
                    <div className="font-medium">{p.label}</div>
                    <div className="text-xs text-muted-foreground">Adjust each day later in Settings.</div>
                  </button>
                ))}
              </div>
            </QuestionShell>
          )}

          {step === 7 && (
            <QuestionShell index={7} title="Google My Business" prompt="Paste your Google Business or Maps URL so we can pull in reviews." icon={<Globe className="size-5" />}>
              <BigInput value={gbUrl} onChange={setGbUrl} placeholder="https://maps.google.com/…" autoFocus />
              <p className="mt-2 text-xs text-muted-foreground">Optional — you can add this later.</p>
            </QuestionShell>
          )}

          {step === 8 && (
            <QuestionShell index={8} title="Menu" prompt="Upload a menu, paste a URL, or type items in.">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="rounded-xl border border-dashed border-border bg-white p-4 cursor-pointer hover:bg-muted flex items-center gap-3">
                    {menuBusy ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5 text-emerald-600" />}
                    <div>
                      <div className="text-sm font-medium">Upload menu (image / PDF)</div>
                      <div className="text-xs text-muted-foreground truncate">{menuFileUrl ? "Uploaded ✓" : "PNG, JPG, PDF"}</div>
                    </div>
                    <input type="file" accept="image/*,application/pdf" hidden onChange={async (e) => {
                      const f = e.target.files?.[0]; e.target.value = "";
                      if (!f) return; setMenuBusy(true);
                      const url = await uploadTo(f, "menu");
                      if (url) setMenuFileUrl(url);
                      setMenuBusy(false);
                    }} />
                  </label>
                  <div className="rounded-xl border border-border bg-white p-4">
                    <div className="text-sm font-medium mb-2">Or paste a menu URL</div>
                    <input value={menuUrl} onChange={(e) => setMenuUrl(e.target.value)}
                      placeholder="https://yoursite.com/menu"
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-white p-4">
                  <div className="text-sm font-medium mb-1">Paste menu text (one item per line)</div>
                  <div className="text-xs text-muted-foreground mb-2">Format: <code>Dish name - Description - $12.50</code></div>
                  <textarea value={menuPasted} onChange={(e) => setMenuPasted(e.target.value)} rows={5}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
                    placeholder="Bruschetta - Grilled bread, tomato, basil - $12&#10;Cacio e Pepe - Pecorino, black pepper - $21" />
                  <button onClick={() => setMenuItems(parseMenuText(menuPasted))}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
                    <Sparkles className="size-3.5" /> Parse into items
                  </button>
                </div>
                {menuItems.length > 0 && (
                  <div className="rounded-xl border border-border bg-white overflow-hidden">
                    <div className="px-4 py-2 text-xs font-semibold uppercase text-muted-foreground bg-muted/40">
                      {menuItems.length} items detected — review before saving
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {menuItems.map((it, i) => (
                        <div key={i} className="grid grid-cols-[1fr_1fr_90px_36px] gap-2 px-3 py-2 border-t border-border">
                          <input value={it.name} onChange={(e) => setMenuItems((m) => m.map((r, idx) => idx === i ? { ...r, name: e.target.value } : r))}
                            className="rounded-md border border-border bg-background px-2 py-1 text-sm" placeholder="Name" />
                          <input value={it.description} onChange={(e) => setMenuItems((m) => m.map((r, idx) => idx === i ? { ...r, description: e.target.value } : r))}
                            className="rounded-md border border-border bg-background px-2 py-1 text-sm" placeholder="Description" />
                          <input value={it.price} onChange={(e) => setMenuItems((m) => m.map((r, idx) => idx === i ? { ...r, price: e.target.value.replace(/[^0-9.]/g, "") } : r))}
                            className="rounded-md border border-border bg-background px-2 py-1 text-sm" placeholder="Price" inputMode="decimal" />
                          <button onClick={() => setMenuItems((m) => m.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-border p-2">
                      <button onClick={() => setMenuItems((m) => [...m, { name: "", description: "", price: "" }])}
                        className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted">
                        <Plus className="size-3.5" /> Add item
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </QuestionShell>
          )}

          {step === 9 && (
            <BookingCustomizer
              slug={slug}
              color={COLORS[colorIdx]}
              colors={COLORS}
              colorIdx={colorIdx}
              setColorIdx={setColorIdx}
              headline={bookingHeadline}
              setHeadline={setBookingHeadline}
              welcome={bookingWelcome}
              setWelcome={setBookingWelcome}
              restaurantName={restaurantName}
            />
          )}

          {step === 10 && (
            <QuestionShell index={10} title="Employees" prompt="Add your team — you can invite them later." icon={<Users className="size-5" />}>
              <StaffList value={staffDrafts} onChange={setStaffDrafts} />
            </QuestionShell>
          )}

          {step === 11 && (
            <QuestionShell index={11} title="Integrations" prompt="Which tools do you already use? (Connect later)" icon={<Puzzle className="size-5" />}>
              <div className="flex flex-wrap gap-2">
                {INTEGRATIONS.map((t) => {
                  const on = integrations.includes(t);
                  return (
                    <button key={t} onClick={() => setIntegrations((s) => on ? s.filter((x) => x !== t) : [...s, t])}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${on ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-border bg-white hover:bg-muted"}`}>
                      {on && <Check className="inline size-3.5 mr-1" />}{t}
                    </button>
                  );
                })}
              </div>
            </QuestionShell>
          )}

          {step === 12 && (
            <QuestionShell index={12} title="Custom domain" prompt="Have your own domain? Add it here (optional)." icon={<Link2 className="size-5" />}>
              <BigInput value={customDomain} onChange={setCustomDomain} placeholder="book.yourrestaurant.com" autoFocus />
              <p className="mt-2 text-xs text-muted-foreground">We'll help you set up DNS after onboarding.</p>
            </QuestionShell>
          )}

          {step === 13 && (
            <QuestionShell index={13} title="Import customers" prompt="Bring your existing guest list — CSV or paste it in." icon={<Database className="size-5" />}>
              <div className="rounded-xl border border-border bg-white p-4">
                <div className="text-sm font-medium mb-1">Paste rows (Name, Email, Phone)</div>
                <div className="text-xs text-muted-foreground mb-2">One per line, comma or tab separated.</div>
                <textarea value={customerPaste} onChange={(e) => setCustomerPaste(e.target.value)} rows={6}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
                  placeholder="Jane Doe, jane@example.com, 555-0100&#10;John Smith, john@example.com, 555-0101" />
                <div className="mt-2 flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-muted">
                    <Upload className="size-3.5" /> Upload CSV
                    <input type="file" accept=".csv,text/csv" hidden onChange={async (e) => {
                      const f = e.target.files?.[0]; e.target.value = "";
                      if (!f) return; setCustomerPaste(await f.text());
                    }} />
                  </label>
                  <button onClick={() => setCustomerDrafts(parseCustomerText(customerPaste))}
                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
                    <Sparkles className="size-3.5" /> Preview
                  </button>
                  {customerDrafts.length > 0 && <span className="text-xs text-muted-foreground">{customerDrafts.length} rows ready</span>}
                </div>
              </div>
            </QuestionShell>
          )}

          {step === 14 && (
            <CelebrateStep
              restaurantName={restaurantName}
              slug={slug}
              onFinish={finish}
              busy={busy}
              primary={COLORS[colorIdx].value}
              accent={COLORS[colorIdx].accent}
            />
          )}

          {step < TOTAL && (
            <div className="mt-8 flex items-center gap-3">
              <button onClick={next} disabled={busy || !canContinue}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60">
                {busy && <Loader2 className="size-4 animate-spin" />} Continue <ArrowRight className="size-4" />
              </button>
              {skippable && (
                <button onClick={skip} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
                  Skip this
                </button>
              )}
              <span className="ml-auto text-xs text-muted-foreground">press <kbd className="rounded border border-border bg-white px-1.5 py-0.5">Enter</kbd></span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function QuestionShell({
  index, title, prompt, children, onEnter, icon,
}: {
  index?: number; title: string; prompt?: string; children: React.ReactNode;
  onEnter?: () => void; icon?: React.ReactNode;
}) {
  return (
    <div
      onKeyDown={(e) => {
        if (e.key === "Enter" && onEnter && !(e.target instanceof HTMLTextAreaElement)) {
          e.preventDefault();
          onEnter();
        }
      }}
    >
      {index !== undefined && (
        <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-700 inline-flex items-center gap-1.5">
          {icon}Question {index}
        </div>
      )}
      <h1 className="mt-1 text-3xl md:text-4xl font-serif font-bold tracking-tight">{title}</h1>
      {prompt && <p className="mt-2 text-lg text-muted-foreground">{prompt}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

function BigInput({
  value, onChange, placeholder, autoFocus, inputMode,
}: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; autoFocus?: boolean; inputMode?: "numeric" | "decimal" | "text";
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);
  return (
    <input ref={ref} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} inputMode={inputMode}
      className="w-full rounded-xl border-2 border-border bg-white px-5 py-4 text-xl focus:outline-none focus:border-emerald-600 transition" />
  );
}

function StaffList({ value, onChange }: { value: StaffDraft[]; onChange: (s: StaffDraft[]) => void }) {
  const add = () => onChange([...value, { id: crypto.randomUUID(), name: "", role: "server", wage: "" }]);
  const update = (id: string, patch: Partial<StaffDraft>) => onChange(value.map((s) => s.id === id ? { ...s, ...patch } : s));
  const remove = (id: string) => onChange(value.filter((s) => s.id !== id));
  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-white p-6 text-center text-sm text-muted-foreground">
          No employees added yet.
        </div>
      )}
      {value.map((s) => (
        <div key={s.id} className="grid grid-cols-[1fr_140px_120px_36px] gap-2 items-center">
          <input value={s.name} onChange={(e) => update(s.id, { name: e.target.value })}
            placeholder="Full name" className="rounded-md border border-border bg-white px-3 py-2 text-sm" />
          <select value={s.role} onChange={(e) => update(s.id, { role: e.target.value as any })}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm">
            <option value="hostess">Hostess</option>
            <option value="server">Server</option>
            <option value="admin">Admin</option>
          </select>
          <input value={s.wage} onChange={(e) => update(s.id, { wage: e.target.value.replace(/[^0-9.]/g, "") })}
            placeholder="$/hr" inputMode="decimal" className="rounded-md border border-border bg-white px-3 py-2 text-sm" />
          <button onClick={() => remove(s.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
        </div>
      ))}
      <button onClick={add} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border bg-white px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
        <Plus className="size-4" /> Add employee
      </button>
    </div>
  );
}

function BookingCustomizer({
  slug, color, colors, colorIdx, setColorIdx, headline, setHeadline, welcome, setWelcome, restaurantName,
}: {
  slug: string | null; color: { value: string; accent: string };
  colors: typeof COLORS; colorIdx: number; setColorIdx: (i: number) => void;
  headline: string; setHeadline: (v: string) => void;
  welcome: string; setWelcome: (v: string) => void;
  restaurantName: string;
}) {
  // Flashing walkthrough — cycle highlight through the 4 elements
  const [flash, setFlash] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setFlash((f) => (f + 1) % 4), 1800);
    return () => clearInterval(t);
  }, []);
  const url = slug ? (typeof window !== "undefined" ? `${window.location.origin}/book/${slug}` : `/book/${slug}`) : "";
  const [copied, setCopied] = useState(false);

  const ring = (i: number) => flash === i
    ? "ring-4 ring-offset-2 ring-emerald-400 animate-pulse"
    : "ring-0";

  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">Question 9</div>
      <h1 className="mt-1 text-3xl md:text-4xl font-serif font-bold tracking-tight">Customize your booking page</h1>
      <p className="mt-2 text-lg text-muted-foreground">Walk through what your guests will see. Watch the highlighted step ✨</p>

      {slug && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm">
          <Globe className="size-4 text-emerald-600" />
          <span className="font-mono text-xs break-all flex-1">{url}</span>
          <button onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch {} }}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white">
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? "Copied" : "Copy"}
          </button>
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs">
            <ExternalLink className="size-3.5" />
          </a>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Editor */}
        <div className="space-y-3">
          <div className={`rounded-xl border-2 border-border bg-white p-4 transition ${ring(0)}`}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">1 · Headline</div>
            <input value={headline} onChange={(e) => setHeadline(e.target.value)}
              placeholder={`Book a table at ${restaurantName || "your place"}`}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className={`rounded-xl border-2 border-border bg-white p-4 transition ${ring(1)}`}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">2 · Welcome message</div>
            <textarea value={welcome} onChange={(e) => setWelcome(e.target.value)} rows={2}
              placeholder="A short note guests see before booking."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className={`rounded-xl border-2 border-border bg-white p-4 transition ${ring(2)}`}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-2">3 · Brand color</div>
            <div className="grid grid-cols-6 gap-2">
              {colors.map((c, i) => (
                <button key={c.name} onClick={() => setColorIdx(i)}
                  className={`h-10 rounded-lg border-2 ${colorIdx === i ? "border-foreground" : "border-transparent"}`}
                  style={{ background: `linear-gradient(135deg, ${c.value}, ${c.accent})` }}
                  title={c.name} />
              ))}
            </div>
          </div>
          <div className={`rounded-xl border-2 border-border bg-white p-4 transition ${ring(3)}`}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">4 · Occasion options</div>
            <div className="flex flex-wrap gap-1.5">
              {["Birthday", "Anniversary", "Date night", "Business", "Family"].map((o) => (
                <span key={o} className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs">{o}</span>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">Auto-included on your booking form.</p>
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
          <div className={`p-6 text-white transition ${flash === 0 || flash === 2 ? "" : ""}`}
            style={{ background: `linear-gradient(135deg, ${color.value}, ${color.accent})` }}>
            <div className={`text-2xl font-serif font-bold ${flash === 0 ? "animate-pulse" : ""}`}>
              {headline || `Book a table at ${restaurantName || "your restaurant"}`}
            </div>
            <div className={`mt-2 text-sm opacity-90 ${flash === 1 ? "animate-pulse" : ""}`}>
              {welcome || "We can't wait to have you. Reserve your table in seconds."}
            </div>
          </div>
          <div className="p-4 bg-white space-y-2">
            <div className="text-xs text-muted-foreground">Party size</div>
            <div className="flex gap-1.5">
              {[2, 3, 4, 5, 6].map((n) => (
                <span key={n} className="grid size-8 place-items-center rounded-md border border-border text-sm">{n}</span>
              ))}
            </div>
            <div className={`mt-3 rounded-lg border border-border p-2 ${flash === 3 ? "ring-2 ring-emerald-400 animate-pulse" : ""}`}>
              <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Occasion</div>
              <div className="flex flex-wrap gap-1">
                {["Birthday", "Anniversary", "Date night"].map((o) => (
                  <span key={o} className="rounded-full border border-border px-2 py-0.5 text-[11px]">{o}</span>
                ))}
              </div>
            </div>
            <button className="mt-2 w-full rounded-md py-2 text-sm font-semibold text-white"
              style={{ background: color.value }}>Reserve</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CelebrateStep({
  restaurantName, slug, onFinish, busy, primary, accent,
}: {
  restaurantName: string; slug: string | null; onFinish: () => void; busy: boolean;
  primary: string; accent: string;
}) {
  const url = useMemo(() => {
    if (typeof window === "undefined" || !slug) return slug ? `/book/${slug}` : "";
    return `${window.location.origin}/book/${slug}`;
  }, [slug]);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { toast.error("Copy failed"); }
  };

  return (
    <div className="text-center">
      <div className="mx-auto inline-flex size-16 items-center justify-center rounded-full bg-emerald-100">
        <Sparkles className="size-8 text-emerald-600" />
      </div>
      <h1 className="mt-4 text-4xl md:text-5xl font-serif font-bold tracking-tight">You're all set 🎉</h1>
      <p className="mt-2 text-lg text-muted-foreground">
        {restaurantName || "Your restaurant"} is live on RestoStack.
      </p>

      {slug && (
        <div className="mt-8 rounded-2xl overflow-hidden border border-border shadow-sm text-left">
          <div className="p-6 text-white" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Your public booking page</div>
            <div className="mt-1 font-mono text-sm break-all">{url}</div>
          </div>
          <div className="p-4 bg-white flex flex-wrap gap-2">
            <button onClick={copy} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied!" : "Copy link"}
            </button>
            <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium">
              <ExternalLink className="size-4" /> Open
            </a>
          </div>
        </div>
      )}

      <button onClick={onFinish} disabled={busy}
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-foreground px-6 py-3 text-base font-semibold text-background hover:opacity-90 disabled:opacity-60">
        {busy && <Loader2 className="size-4 animate-spin" />} Go to my dashboard <ArrowRight className="size-4" />
      </button>
    </div>
  );
}

void DEFAULT_HOURS;
