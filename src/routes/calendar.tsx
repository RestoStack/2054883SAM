import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { useBookings } from "@/lib/v2-data";
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — RestoStack" },
      { name: "description", content: "Month view of all bookings across your restaurant." },
    ],
  }),
  component: CalendarPage,
});

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const fmtKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function CalendarPage() {
  const now = new Date();
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const { data: bookings = [], isLoading } = useBookings();

  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: { date: Date | null }[] = [];
  for (let i = 0; i < startDay; i++) cells.push({ date: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(year, month, d) });
  while (cells.length % 7 !== 0) cells.push({ date: null });

  const bookingsByDay = useMemo(() => {
    return bookings.reduce<Record<string, typeof bookings>>((acc, b) => {
      if (!b.date) return acc;
      (acc[b.date] ||= []).push(b);
      return acc;
    }, {});
  }, [bookings]);

  const todayKey = fmtKey(now);

  return (
    <AppShell>
      <div className="px-5 pt-3 pb-3 border-b border-border bg-card/40 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Month overview of live bookings — click a guest to open Bookings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="size-9 rounded-md border border-border bg-card flex items-center justify-center hover:bg-muted/50"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="px-4 py-2 text-sm font-semibold min-w-[160px] text-center">
            {MONTHS[month]} {year}
          </div>
          <button
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="size-9 rounded-md border border-border bg-card flex items-center justify-center hover:bg-muted/50"
          >
            <ChevronRight className="size-4" />
          </button>
          <button
            onClick={() => setCursor(new Date(now.getFullYear(), now.getMonth(), 1))}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted/50"
          >
            Today
          </button>
          <Link
            to="/bookings"
            className="inline-flex items-center gap-2 rounded-md bg-success px-4 py-2 text-sm font-semibold text-success-foreground"
          >
            <Plus className="size-4" /> New Booking
          </Link>
        </div>
      </div>

      <div className="p-4 lg:p-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="size-5 animate-spin mr-2" /> Loading calendar…
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-7 border-b border-border bg-muted/30">
              {DOW.map((d) => (
                <div key={d} className="px-3 py-2 text-xs font-semibold text-muted-foreground text-center">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((c, i) => {
                const key = c.date ? fmtKey(c.date) : "";
                const dayBookings = key ? bookingsByDay[key] ?? [] : [];
                const isToday = key === todayKey;
                return (
                  <div
                    key={i}
                    className={`min-h-[110px] border-r border-b border-border last:border-r-0 p-2 ${!c.date ? "bg-muted/20" : ""}`}
                  >
                    {c.date && (
                      <>
                        <div
                          className={`text-xs font-semibold mb-1 inline-flex items-center justify-center size-6 rounded-full ${
                            isToday ? "bg-success text-success-foreground" : "text-foreground"
                          }`}
                        >
                          {c.date.getDate()}
                        </div>
                        <div className="space-y-1">
                          {dayBookings.slice(0, 3).map((b) => (
                            <Link
                              key={b.id}
                              to="/bookings"
                              search={{ date: b.date } as never}
                              className="block truncate rounded-sm bg-info/15 text-info text-[11px] font-medium px-1.5 py-0.5 hover:bg-info/25"
                              title={`${b.time} — ${b.name} (${b.table})`}
                            >
                              {b.time.replace(" PM", "p").replace(" AM", "a")} {b.name.split(" ")[0]}
                            </Link>
                          ))}
                          {dayBookings.length > 3 && (
                            <div className="text-[10px] text-muted-foreground px-1.5">
                              +{dayBookings.length - 3} more
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
