import { useEffect, useState } from "react";

export type DayHours = { open: string; close: string; closed: boolean };
export type WeekHours = Record<string, DayHours>;

export const DAYS: { key: string; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

export const DEFAULT_HOURS: WeekHours = Object.fromEntries(
  DAYS.map((d) => [d.key, { open: "11:00", close: "22:00", closed: false }])
);

const PRESETS: { label: string; hours: WeekHours }[] = [
  {
    label: "Restaurant default (11am–10pm)",
    hours: Object.fromEntries(DAYS.map((d) => [d.key, { open: "11:00", close: "22:00", closed: false }])),
  },
  {
    label: "Dinner only (5–11pm)",
    hours: Object.fromEntries(DAYS.map((d) => [d.key, { open: "17:00", close: "23:00", closed: false }])),
  },
  {
    label: "Cafe (8am–4pm)",
    hours: Object.fromEntries(DAYS.map((d) => [d.key, { open: "08:00", close: "16:00", closed: false }])),
  },
];

export function HoursEditor({ value, onChange }: { value: WeekHours | null; onChange: (w: WeekHours) => void }) {
  const [hours, setHours] = useState<WeekHours>(value ?? DEFAULT_HOURS);
  useEffect(() => { setHours(value ?? DEFAULT_HOURS); }, [value]);

  const patch = (day: string, dh: Partial<DayHours>) => {
    const next = { ...hours, [day]: { ...hours[day], ...dh } };
    setHours(next);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button key={p.label} type="button" onClick={() => { setHours(p.hours); onChange(p.hours); }}
            className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted">
            {p.label}
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        {DAYS.map((d, i) => {
          const dh = hours[d.key] ?? { open: "11:00", close: "22:00", closed: false };
          return (
            <div key={d.key} className={`grid grid-cols-[110px_1fr_1fr_90px] gap-3 items-center px-3 py-2 ${i > 0 ? "border-t border-border" : ""}`}>
              <div className="text-sm font-medium">{d.label}</div>
              <input type="time" value={dh.open} disabled={dh.closed}
                onChange={(e) => patch(d.key, { open: e.target.value })}
                className="rounded-md border border-border bg-background px-2 py-1 text-sm disabled:opacity-40" />
              <input type="time" value={dh.close} disabled={dh.closed}
                onChange={(e) => patch(d.key, { close: e.target.value })}
                className="rounded-md border border-border bg-background px-2 py-1 text-sm disabled:opacity-40" />
              <label className="flex items-center gap-2 text-xs font-medium">
                <input type="checkbox" checked={dh.closed}
                  onChange={(e) => patch(d.key, { closed: e.target.checked })} />
                Closed
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Return an array of "HH:MM" slots between open & close (30-min steps), or [] if closed. */
export function slotsForDay(hours: WeekHours | null | undefined, dayKey: string): string[] {
  if (!hours) return [];
  const dh = hours[dayKey];
  if (!dh || dh.closed) return [];
  const [oh, om] = dh.open.split(":").map(Number);
  const [ch, cm] = dh.close.split(":").map(Number);
  const start = oh * 60 + (om || 0);
  const end = ch * 60 + (cm || 0);
  const out: string[] = [];
  for (let t = start; t + 60 <= end; t += 30) {
    const hh = Math.floor(t / 60);
    const mm = t % 60;
    out.push(`${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
  }
  return out;
}

export function fmtSlot12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
}

export function dayKeyFromDate(d: Date): string {
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][d.getDay()];
}
