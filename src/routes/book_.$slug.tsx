import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays, Users, Clock, MapPin, Phone, ChevronLeft, ChevronRight,
  Check, Star, Sparkles, ShieldCheck, Gift, Cake, Heart, Briefcase,
  PartyPopper, Wine, BookOpen, Sun, Moon, Play, Quote, Loader2, Utensils,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { slotsForDay, fmtSlot12, dayKeyFromDate, DAYS, type WeekHours } from "@/components/onboarding/HoursEditor";
import heroImg from "@/assets/book-hero-v2.jpg";
import mainImg from "@/assets/section-main.jpg";
import patioImg from "@/assets/section-patio.jpg";
import barImg from "@/assets/section-bar.jpg";
import privateImg from "@/assets/section-private.jpg";
import dishMargherita from "@/assets/dish-margherita.jpg";
import dishAlfredo from "@/assets/dish-chicken-alfredo.jpg";
import dishSalmon from "@/assets/dish-salmon.jpg";
import dishTiramisu from "@/assets/dish-tiramisu.jpg";
import dishTruffle from "@/assets/dish-truffle-pasta.jpg";

export const Route = createFileRoute("/book_/$slug")({
  head: ({ params }) => ({
    meta: [{ title: `Book a table — ${params.slug}` }],
  }),
  component: PublicBookingPage,
});

type Restaurant = {
  id: string; name: string; slug: string; city: string | null; address: string | null;
  phone: string | null; logo_url: string | null; cover_url: string | null; cuisine: string | null;
  hours: WeekHours | null;
  brand_primary: string | null; brand_accent: string | null;
  booking_headline: string | null; booking_welcome: string | null;
};

type MenuRow = { id: string; name: string; description: string | null; price: number | null; image_url: string | null; category_name: string | null };

const PARTY_SIZES = [1, 2, 3, 4, 5, 6, 7, 8];
const FALLBACK_TIMES: { t: string; popular?: boolean }[] = [
  { t: "17:30" }, { t: "18:00", popular: true }, { t: "18:30" }, { t: "19:00" },
  { t: "19:30", popular: true }, { t: "20:00" }, { t: "20:30" }, { t: "21:00" },
];
const SECTION_IMGS: Record<string, string> = {
  main: mainImg, patio: patioImg, bar: barImg, private: privateImg,
};
const SECTIONS = [
  { id: "main", name: "Main Dining", desc: "Cozy interior seating", img: mainImg, tag: "Most popular" },
  { id: "patio", name: "Outdoor Patio", desc: "Garden seating under string lights", img: patioImg, tag: "Sunset view" },
  { id: "bar", name: "Bar Lounge", desc: "Counter seats with full menu", img: barImg, tag: "Walk-in vibes" },
  { id: "private", name: "Private Room", desc: "For groups of 8+, intimate setting", img: privateImg, tag: "Groups" },
];
const OCCASIONS = [
  { id: "birthday", label: "Birthday", Icon: Cake },
  { id: "anniversary", label: "Anniversary", Icon: Heart },
  { id: "date", label: "Date night", Icon: Wine },
  { id: "business", label: "Business", Icon: Briefcase },
  { id: "celebration", label: "Celebration", Icon: PartyPopper },
];
const FALLBACK_MENU = [
  { name: "Margherita Pizza", price: 18, description: "San Marzano tomatoes, fresh mozzarella, basil", img: dishMargherita },
  { name: "Truffle Pasta", price: 26, description: "Creamy black truffle tagliatelle", img: dishTruffle },
  { name: "Chicken Alfredo", price: 22, description: "Grilled chicken, parmesan cream", img: dishAlfredo },
  { name: "Grilled Salmon", price: 28, description: "Lemon herb, seasonal vegetables", img: dishSalmon },
  { name: "Tiramisu", price: 12, description: "Classic espresso-soaked ladyfingers", img: dishTiramisu },
];
const VIBES = [
  { img: heroImg, title: "Wood-fired magic", views: "12.4K" },
  { img: patioImg, title: "Patio nights", views: "8.2K" },
  { img: dishTruffle, title: "Truffle pasta ASMR", views: "24K" },
  { img: barImg, title: "Bar energy", views: "6.7K" },
];
const REVIEWS = [
  { name: "Sarah M.", text: "Best dining experience in the neighborhood. The vibe is unmatched.", rating: 5 },
  { name: "James L.", text: "Came for my birthday — they made it so special. Free dessert and the whole room sang!", rating: 5 },
  { name: "Priya K.", text: "The food is life-changing. Already booked my next visit.", rating: 5 },
  { name: "Mike & Ana", text: "Our go-to date spot. Intimate, great wine list, staff is warm.", rating: 4 },
];
const FALLBACK_HOURS: WeekHours = {
  mon: { open: "11:00", close: "22:00", closed: false },
  tue: { open: "11:00", close: "22:00", closed: false },
  wed: { open: "11:00", close: "22:00", closed: false },
  thu: { open: "11:00", close: "22:00", closed: false },
  fri: { open: "11:00", close: "23:00", closed: false },
  sat: { open: "11:00", close: "23:00", closed: false },
  sun: { open: "12:00", close: "21:00", closed: false },
};

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function buildDates(start: Date, count: number) {
  return Array.from({ length: count }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
}
function isOpenNow(hours: WeekHours): boolean {
  const now = new Date();
  const dh = hours[dayKeyFromDate(now)];
  if (!dh || dh.closed) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = dh.open.split(":").map(Number);
  const [ch, cm] = dh.close.split(":").map(Number);
  return cur >= oh * 60 + om && cur <= ch * 60 + cm;
}

function PublicBookingPage() {
  const { slug } = Route.useParams();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<MenuRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: rData, error: rErr }, { data: mData }] = await Promise.all([
        supabase.rpc("v2_public_get_restaurant", { _slug: slug }),
        supabase.rpc("v2_public_get_menu", { _slug: slug }),
      ]);
      const row = Array.isArray(rData) ? rData[0] : rData;
      if (rErr || !row) setNotFound(true);
      else setRestaurant(row as unknown as Restaurant);
      if (Array.isArray(mData)) setMenu(mData as unknown as MenuRow[]);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>;
  }
  if (notFound || !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md text-center rounded-2xl border border-border bg-card p-8">
          <div className="inline-flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3"><MapPin className="size-6" /></div>
          <h1 className="text-xl font-bold">Restaurant not found</h1>
          <p className="text-sm text-muted-foreground mt-1">We couldn't find a restaurant at <span className="font-mono">/book/{slug}</span>.</p>
          <Link to="/" className="mt-5 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Go home</Link>
        </div>
      </div>
    );
  }

  return <BookingFlow restaurant={restaurant} menu={menu} />;
}

function BookingFlow({ restaurant, menu }: { restaurant: Restaurant; menu: MenuRow[] }) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const [weekStart, setWeekStart] = useState(today);
  const dates = useMemo(() => buildDates(weekStart, 7), [weekStart]);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [party, setParty] = useState(2);
  const [date, setDate] = useState<Date>(today);
  const [time, setTime] = useState<string | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const [isBirthday, setIsBirthday] = useState<boolean | null>(null);
  const [occasion, setOccasion] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [joinLoyalty, setJoinLoyalty] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const primary = restaurant.brand_primary || "#dc2626";
  const accent = restaurant.brand_accent || "#b91c1c";
  const headline = restaurant.booking_headline || "Reserve your table";
  const welcome = restaurant.booking_welcome || "Pick your seat, tell us the occasion — under a minute.";
  const cover = restaurant.cover_url || heroImg;
  const hours = restaurant.hours || FALLBACK_HOURS;
  const openNow = isOpenNow(hours);
  const displayMenu: { name: string; description: string | null; price: string; img: string }[] = menu.length > 0
    ? menu.map((m, i) => ({
        name: m.name,
        description: m.description,
        price: m.price != null ? `$${Number(m.price).toFixed(m.price % 1 === 0 ? 0 : 2)}` : "",
        img: m.image_url || FALLBACK_MENU[i % FALLBACK_MENU.length].img,
      }))
    : FALLBACK_MENU.map((m) => ({ name: m.name, description: m.description, price: `$${m.price}`, img: m.img }));

  const dayKey = dayKeyFromDate(date);
  const dayInfo = hours[dayKey];
  const isClosed = !!(dayInfo && dayInfo.closed);
  const slots = slotsForDay(hours, dayKey);
  const timeSlots = slots.length > 0
    ? slots.map((t, i) => ({ t, popular: i === 2 || i === 5 }))
    : FALLBACK_TIMES;

  useEffect(() => { setTime(null); }, [date]);

  const canStep2 = !!time && !isClosed;
  const canStep3 = !!section && isBirthday !== null;
  const canConfirm = name.trim().length > 1 && phone.trim().length >= 6;

  const submit = async () => {
    if (!canConfirm || !time) return;
    setBusy(true); setError(null);
    const isoDate = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
    const occLabel = isBirthday ? "Birthday" : occasion ? OCCASIONS.find(o => o.id === occasion)?.label : "";
    const notesFull = [occLabel && `Occasion: ${occLabel}`, joinLoyalty && "Wants loyalty signup", notes.trim()].filter(Boolean).join(" · ");
    const sectionName = SECTIONS.find(s => s.id === section)?.name || "";
    const { error } = await supabase.rpc("v2_public_create_booking", {
      _slug: restaurant.slug,
      _guest_name: name.trim(),
      _guest_phone: phone.trim(),
      _guest_email: email.trim(),
      _party_size: party,
      _date: isoDate,
      _time: `${time.length === 5 ? time : time}:00`.replace(/::00$/, ":00"),
      _section: sectionName,
      _notes: notesFull,
    });
    setBusy(false);
    if (error) { setError(error.message || "Could not save your booking."); return; }
    setConfirmed(true);
  };

  const brandStyle = { "--brand": primary, "--brand-2": accent } as React.CSSProperties;

  if (confirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ ...brandStyle, background: `linear-gradient(180deg, ${primary}14, #fff)` }}>
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-border p-8 text-center">
          <div className="size-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
            <Check className="size-8" strokeWidth={3} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">You're booked!</h1>
          <p className="text-muted-foreground mt-1">We can't wait to host you at {restaurant.name}.</p>
          <div className="mt-6 rounded-xl p-4 text-left space-y-2 text-sm border" style={{ background: `${primary}0d`, borderColor: `${primary}33` }}>
            <div className="flex items-center gap-2"><CalendarDays className="size-4" style={{ color: primary }} /><span className="font-medium">{date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })} · {fmtSlot12(time!)}</span></div>
            <div className="flex items-center gap-2"><Users className="size-4" style={{ color: primary }} /><span>{party} guest{party === 1 ? "" : "s"}</span></div>
            {section && <div className="flex items-center gap-2"><MapPin className="size-4" style={{ color: primary }} /><span>{SECTIONS.find(s => s.id === section)?.name}</span></div>}
            {(isBirthday || occasion) && <div className="flex items-center gap-2"><Sparkles className="size-4" style={{ color: primary }} /><span>{isBirthday ? "Birthday" : OCCASIONS.find(o => o.id === occasion)?.label}</span></div>}
          </div>
          {joinLoyalty && (
            <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-800 flex items-center gap-2">
              <Gift className="size-4" /> You'll earn $5 credit when you visit.
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-4">A confirmation has been sent to {email || phone}.</p>
          <button onClick={() => { setConfirmed(false); setStep(1); setTime(null); setSection(null); setIsBirthday(null); setOccasion(null); }}
            className="mt-6 text-sm font-medium hover:underline" style={{ color: primary }}>
            Make another booking
          </button>
        </div>
      </div>
    );
  }

  const brandFillClass = "brand-fill";
  const brandBorderClass = "brand-border";

  return (
    <div className="min-h-screen bg-stone-50 pb-24 lg:pb-6" style={brandStyle}>
      {/* Hero */}
      <div className="relative h-56 sm:h-72 lg:h-44 w-full overflow-hidden">
        <img src={cover} alt={restaurant.name} className="absolute inset-0 w-full h-full object-cover" width={1600} height={700} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60" />
        <header className="relative px-4 sm:px-10 pt-4 sm:pt-5">
          <div className="max-w-5xl mx-auto flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              {restaurant.logo_url ? (
                <img src={restaurant.logo_url} alt="" className="size-9 rounded-full object-cover ring-2 ring-white/50" />
              ) : (
                <div className="size-8 sm:size-9 rounded-full text-white flex items-center justify-center font-serif text-base sm:text-lg" style={{ background: primary }}>
                  {restaurant.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="font-serif text-base sm:text-lg leading-tight">{restaurant.name}</div>
                <div className="text-[10px] sm:text-[11px] text-white/80 -mt-0.5">
                  {[restaurant.cuisine, restaurant.city].filter(Boolean).join(" · ") || "Reservations"}
                </div>
              </div>
            </div>
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`} className="flex sm:hidden items-center gap-1 text-xs font-medium text-white bg-white/15 backdrop-blur border border-white/20 rounded-full px-2.5 py-1">
                <Phone className="size-3" /> Call
              </a>
            )}
            <div className="hidden sm:flex items-center gap-4 text-xs text-white/90">
              <span className="flex items-center gap-1"><Star className="size-3.5 fill-amber-300 text-amber-300" /> 4.8</span>
              {restaurant.city && <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {restaurant.city}</span>}
              {restaurant.phone && <span className="flex items-center gap-1"><Phone className="size-3.5" /> {restaurant.phone}</span>}
            </div>
          </div>
        </header>
        <div className="absolute bottom-4 sm:bottom-6 lg:bottom-3 left-0 right-0 text-center text-white px-5">
          <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-medium px-2.5 py-1 rounded-full bg-white/15 backdrop-blur border border-white/20">
            <Sparkles className="size-3" /> Instant confirmation
          </span>
          <h1 className="font-serif text-[26px] leading-tight sm:text-4xl lg:text-3xl mt-2 lg:mt-1 tracking-tight">{headline}</h1>
          <p className="text-white/85 mt-1 text-xs lg:text-[11px]">{welcome}</p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-10 mt-6 sm:mt-8 lg:mt-4 pb-8 lg:pb-4 grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-4">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-4 sm:mb-5 lg:mb-3">
            <StepDot n={1} label="When" active={step === 1} done={step > 1} primary={primary} />
            <div className="h-px w-5 sm:w-8 bg-border" />
            <StepDot n={2} label="Where" active={step === 2} done={step > 2} primary={primary} />
            <div className="h-px w-5 sm:w-8 bg-border" />
            <StepDot n={3} label="Details" active={step === 3} done={false} primary={primary} />
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-lg p-4 sm:p-8 lg:p-5">
            {step === 1 && (
              <div className="space-y-7 lg:space-y-4">
                <section>
                  <label className="text-sm font-semibold flex items-center gap-2 mb-3"><Users className="size-4 brand-ic" /> How many guests?</label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {PARTY_SIZES.map((n) => (
                      <button key={n} onClick={() => setParty(n)}
                        className={`h-11 lg:h-9 rounded-lg border text-sm font-medium transition ${party === n ? `${brandFillClass} text-white shadow-sm` : "bg-white border-border hover-brand"}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <button className="text-xs brand-ic hover:underline mt-2">Larger party? Contact us →</button>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold flex items-center gap-2"><CalendarDays className="size-4 brand-ic" /> Pick a date</label>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); if (d >= today) setWeekStart(d); else setWeekStart(today); }}
                        className="size-8 rounded-md border border-border hover:bg-muted/50 flex items-center justify-center"><ChevronLeft className="size-4" /></button>
                      <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }}
                        className="size-8 rounded-md border border-border hover:bg-muted/50 flex items-center justify-center"><ChevronRight className="size-4" /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {dates.map((d) => {
                      const selected = sameDay(d, date);
                      const isToday = sameDay(d, today);
                      const dayClosed = !!hours[dayKeyFromDate(d)]?.closed;
                      return (
                        <button key={d.toISOString()} onClick={() => setDate(d)} disabled={dayClosed}
                          className={`flex flex-col items-center py-2.5 lg:py-1.5 rounded-lg border transition disabled:opacity-40 disabled:cursor-not-allowed ${selected ? `${brandFillClass} text-white shadow-sm` : "bg-white border-border hover-brand"}`}>
                          <span className={`text-[10px] uppercase tracking-wide ${selected ? "text-white/85" : "text-muted-foreground"}`}>{d.toLocaleDateString(undefined, { weekday: "short" })}</span>
                          <span className="text-lg font-semibold leading-tight mt-0.5">{d.getDate()}</span>
                          {isToday && <span className={`text-[9px] mt-0.5 ${selected ? "text-white/85" : "brand-ic"}`}>Today</span>}
                          {dayClosed && !isToday && <span className="text-[9px] mt-0.5 text-muted-foreground">Closed</span>}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section>
                  <label className="text-sm font-semibold flex items-center gap-2 mb-3"><Clock className="size-4 brand-ic" /> Available times</label>
                  {isClosed ? (
                    <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground text-center">Closed on this day. Pick another date.</div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {timeSlots.map((s) => {
                        const selected = time === s.t;
                        return (
                          <button key={s.t} onClick={() => setTime(s.t)}
                            className={`relative h-11 lg:h-9 rounded-lg border text-sm font-medium transition ${selected ? `${brandFillClass} text-white shadow-sm` : "bg-white border-border hover-brand"}`}>
                            {fmtSlot12(s.t)}
                            {s.popular && !selected && (
                              <span className="absolute -top-1.5 -right-1.5 text-[9px] font-semibold bg-amber-100 px-1.5 py-0.5 rounded-full brand-ic brand-border-soft">Popular</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>

                <FooterNav onNext={() => setStep(2)} nextLabel="Choose seating" canNext={canStep2} primary={primary} />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 lg:space-y-4">
                <Summary date={date} time={time} party={party} onChange={() => setStep(1)} primary={primary} />

                <section>
                  <label className="text-sm font-semibold flex items-center gap-2 mb-3"><MapPin className="size-4 brand-ic" /> Where would you like to sit?</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SECTIONS.map((s) => {
                      const selected = section === s.id;
                      return (
                        <button key={s.id} onClick={() => setSection(s.id)}
                          className={`group relative text-left rounded-xl overflow-hidden border-2 transition shadow-sm ${selected ? `${brandBorderClass}` : "border-border hover-brand-border"}`}
                          style={selected ? { boxShadow: `0 0 0 3px ${primary}33` } : undefined}>
                          <div className="relative h-32 sm:h-32 lg:h-24 overflow-hidden">
                            <img src={SECTION_IMGS[s.id] || s.img} alt={s.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/90 text-stone-800">{s.tag}</span>
                            {selected && <div className="absolute top-2 right-2 size-7 rounded-full text-white flex items-center justify-center" style={{ background: primary }}><Check className="size-4" strokeWidth={3} /></div>}
                            <div className="absolute bottom-2 left-3 right-3 text-white">
                              <div className="font-semibold">{s.name}</div>
                              <div className="text-xs text-white/85">{s.desc}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section>
                  <label className="text-sm font-semibold flex items-center gap-2 mb-3"><Cake className="size-4 brand-ic" /> Is it a birthday?</label>
                  <div className="grid grid-cols-2 gap-2 max-w-xs">
                    <button onClick={() => setIsBirthday(true)}
                      className={`h-11 lg:h-9 rounded-lg border text-sm font-medium transition ${isBirthday === true ? `${brandFillClass} text-white` : "bg-white border-border hover-brand"}`}>Yes 🎂</button>
                    <button onClick={() => setIsBirthday(false)}
                      className={`h-11 lg:h-9 rounded-lg border text-sm font-medium transition ${isBirthday === false ? `${brandFillClass} text-white` : "bg-white border-border hover-brand"}`}>No</button>
                  </div>
                  {isBirthday && <p className="text-xs brand-ic mt-2 flex items-center gap-1"><Gift className="size-3.5" /> We'll bring a complimentary dessert with a candle.</p>}
                </section>

                <section>
                  <label className="text-sm font-semibold flex items-center gap-2 mb-3"><PartyPopper className="size-4 brand-ic" /> What type of event?</label>
                  <div className="flex flex-wrap gap-2">
                    {OCCASIONS.map(({ id, label, Icon }) => {
                      const selected = occasion === id;
                      return (
                        <button key={id} onClick={() => setOccasion(selected ? null : id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm border transition ${selected ? `${brandFillClass} text-white` : "bg-white border-border hover-brand"}`}>
                          <Icon className="size-4" /> {label}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <FooterNav onBack={() => setStep(1)} onNext={() => setStep(3)} nextLabel="Add your details" canNext={canStep3} primary={primary} />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 lg:space-y-4">
                <Summary date={date} time={time} party={party} section={SECTIONS.find(s => s.id === section)?.name} onChange={() => setStep(1)} primary={primary} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Full name" required primary={primary}>
                    <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Jane Smith" className="input" />
                  </Field>
                  <Field label="Phone number" required primary={primary}>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} placeholder="(555) 123-4567" className="input" />
                  </Field>
                  <Field label="Email" className="sm:col-span-2" primary={primary}>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} type="email" placeholder="jane@email.com" className="input" />
                  </Field>
                  <Field label="Special request (optional)" className="sm:col-span-2" primary={primary}>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} rows={3} placeholder="Allergies, seating preferences, accessibility…" className="input resize-none" />
                  </Field>
                </div>

                <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition ${joinLoyalty ? "border-emerald-300 bg-emerald-50/60" : "border-border bg-white hover:border-emerald-200"}`}>
                  <input type="checkbox" checked={joinLoyalty} onChange={(e) => setJoinLoyalty(e.target.checked)} className="mt-0.5 size-4 accent-emerald-600" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="size-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center"><Gift className="size-4" /></span>
                      <span className="font-semibold text-sm">Earn $5 every visit</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-600 text-white">FREE</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Join {restaurant.name} Rewards and get $5 credit for tonight's visit — plus perks at 3, 6, and 9 visits.</p>
                  </div>
                </label>

                {error && <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">{error}</div>}

                <FooterNav onBack={() => setStep(2)} onNext={submit} nextLabel={busy ? "Confirming…" : "Confirm booking"} canNext={canConfirm && !busy} nextIcon={busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} primary={primary} />
                <p className="text-[11px] text-muted-foreground text-center">By booking you agree to receive a reminder from {restaurant.name}.</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 lg:mt-3 text-sm">
            <Trust icon={<ShieldCheck className="size-4 text-emerald-600" />} title="Instant confirmation" sub="No waiting on a callback" />
            <Trust icon={<Gift className="size-4" style={{ color: primary }} />} title="$5 every visit" sub="Free to join" />
            <Trust icon={<Star className="size-4 text-amber-500 fill-amber-500" />} title="Loved by guests" sub="4.8 average rating" />
          </div>

          {/* Vibe & Reviews */}
          <div className="mt-6 space-y-6 lg:space-y-4">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><Play className="size-4 brand-ic" /> The Vibe</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {VIBES.map((v, i) => (
                  <button key={i} className="group relative rounded-xl overflow-hidden border border-border aspect-[9/16] bg-stone-900 text-left">
                    <img src={v.img} alt={v.title} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-60 transition" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="size-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                        <Play className="size-5 ml-0.5" style={{ color: primary, fill: primary }} />
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black/80 to-transparent">
                      <p className="text-white text-xs font-semibold leading-tight">{v.title}</p>
                      <p className="text-white/70 text-[10px] mt-0.5">{v.views} views</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><Quote className="size-4 brand-ic" /> What guests are saying</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {REVIEWS.map((r, i) => (
                  <div key={i} className="rounded-xl border border-border bg-white p-4">
                    <div className="flex items-center gap-1 mb-2">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} className={`size-3.5 ${j < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                      ))}
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">"{r.text}"</p>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">— {r.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <aside className="space-y-5 lg:space-y-3">
          <div className="bg-white rounded-2xl border border-border shadow-sm p-5 lg:p-4">
            <div className="flex items-center gap-2 mb-4 lg:mb-2">
              <BookOpen className="size-5 brand-ic" />
              <h2 className="font-semibold">Popular Menu</h2>
            </div>
            <div className="space-y-3 lg:space-y-2">
              {displayMenu.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-center gap-3 group">
                  <img src={item.img} alt={item.name} className="size-14 lg:size-10 rounded-lg object-cover border border-border group-hover:scale-105 transition" width={56} height={56} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{item.name}</span>
                      <span className="text-sm font-semibold brand-ic">{item.price}</span>
                    </div>
                    {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-sm p-5 lg:p-4">
            <div className="flex items-center gap-2 mb-4 lg:mb-2">
              <Clock className="size-5 brand-ic" />
              <h2 className="font-semibold">Hours</h2>
            </div>
            <div className="space-y-2 lg:space-y-1.5">
              {DAYS.map((d) => {
                const dh = hours[d.key];
                return (
                  <div key={d.key} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{d.label}</span>
                    <span className="font-medium">{dh?.closed || !dh ? "Closed" : `${fmtSlot12(dh.open)} – ${fmtSlot12(dh.close)}`}</span>
                  </div>
                );
              })}
            </div>
            <div className={`mt-3 flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${openNow ? "text-emerald-700 bg-emerald-50" : "text-muted-foreground bg-muted/40"}`}>
              {openNow ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
              <span>{openNow ? "Open now" : "Closed now"}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-sm p-5 lg:p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="size-5 brand-ic" />
              <h2 className="font-semibold">Find us</h2>
            </div>
            <p className="text-sm text-foreground leading-relaxed">
              {restaurant.address || "Address coming soon"}<br />
              {restaurant.city}
            </p>
            {restaurant.phone && (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="size-4" />
                <span>{restaurant.phone}</span>
              </div>
            )}
            <div className="mt-3 rounded-xl bg-muted/30 border border-border h-24 sm:h-32 lg:h-16 flex items-center justify-center text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><MapPin className="size-3.5" /> Map preview</span>
            </div>
          </div>

          <div className="rounded-xl bg-stone-900 text-stone-100 p-4 text-xs leading-relaxed">
            <div className="flex items-center gap-2 mb-1.5">
              <Moon className="size-3.5" />
              <span className="font-semibold text-sm">Late night?</span>
            </div>
            Ask about our bar seating — walk-ins welcome on quieter nights.
          </div>
        </aside>
      </main>

      <div className="max-w-6xl mx-auto px-4 sm:px-10 pb-6 text-center">
        <div className="inline-flex items-center gap-2 text-[11px] text-muted-foreground bg-white rounded-full border border-border px-3 py-1.5 shadow-sm">
          <div className="size-4 rounded flex items-center justify-center text-white font-bold text-[8px]" style={{ background: primary }}>R</div>
          Powered by <span className="font-semibold text-foreground">Restostack</span>
        </div>
      </div>

      <style>{`
        .brand-ic { color: ${primary}; }
        .brand-fill { background: ${primary}; border-color: ${primary}; }
        .brand-border { border-color: ${primary}; }
        .brand-border-soft { border: 1px solid ${primary}55; }
        .hover-brand:hover { border-color: ${primary}80; background: ${primary}0d; }
        .hover-brand-border:hover { border-color: ${primary}80; }
        .input { width: 100%; height: 42px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--color-border); background: white; font-size: 14px; outline: none; transition: border-color .15s, box-shadow .15s; }
        textarea.input { height: auto; padding: 10px 12px; }
        .input:focus { border-color: ${primary}; box-shadow: 0 0 0 3px ${primary}26; }
      `}</style>
    </div>
  );
}

function StepDot({ n, label, active, done, primary }: { n: number; label: string; active: boolean; done: boolean; primary: string }) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <div className="size-7 rounded-full flex items-center justify-center text-xs font-semibold border"
        style={done ? { background: "#10b981", borderColor: "#10b981", color: "#fff" } : active ? { background: primary, borderColor: primary, color: "#fff" } : { background: "#fff", borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>
        {done ? <Check className="size-3.5" strokeWidth={3} /> : n}
      </div>
      <span className={`text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground hidden sm:inline"}`}>{label}</span>
    </div>
  );
}

function Field({ label, required, children, className = "", primary }: { label: string; required?: boolean; children: React.ReactNode; className?: string; primary: string }) {
  return (
    <div className={className}>
      <label className="text-sm font-medium mb-1.5 block">{label} {required && <span style={{ color: primary }}>*</span>}</label>
      {children}
    </div>
  );
}

function Trust({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-3 flex items-start gap-3">
      <div className="size-8 rounded-full bg-muted/40 flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}

function Summary({ date, time, party, section, onChange, primary }: { date: Date; time: string | null; party: number; section?: string; onChange: () => void; primary: string }) {
  return (
    <div className="rounded-xl p-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm border" style={{ background: `${primary}0d`, borderColor: `${primary}33` }}>
      <span className="flex items-center gap-1.5"><CalendarDays className="size-4" style={{ color: primary }} /> {date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
      {time && <span className="flex items-center gap-1.5"><Clock className="size-4" style={{ color: primary }} /> {fmtSlot12(time)}</span>}
      <span className="flex items-center gap-1.5"><Users className="size-4" style={{ color: primary }} /> {party} {party === 1 ? "guest" : "guests"}</span>
      {section && <span className="flex items-center gap-1.5"><MapPin className="size-4" style={{ color: primary }} /> {section}</span>}
      <button onClick={onChange} className="ml-auto text-xs hover:underline" style={{ color: primary }}>Change</button>
    </div>
  );
}

function FooterNav({ onBack, onNext, nextLabel, canNext, nextIcon, primary }: { onBack?: () => void; onNext: () => void; nextLabel: string; canNext: boolean; nextIcon?: React.ReactNode; primary: string }) {
  return (
    <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
      {onBack ? (
        <button onClick={onBack} className="text-sm font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1 shrink-0">
          <ChevronLeft className="size-4" /> Back
        </button>
      ) : <div className="hidden sm:flex text-xs text-muted-foreground items-center gap-1.5"><ShieldCheck className="size-3.5 text-emerald-600" /> Free cancellation up to 2 hours before</div>}
      <button disabled={!canNext} onClick={onNext}
        style={{ background: primary }}
        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg text-white px-5 py-3 sm:py-2.5 text-sm font-semibold shadow-sm hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed">
        {nextIcon} {nextLabel} {!nextIcon && <ChevronRight className="size-4" />}
      </button>
    </div>
  );
}
