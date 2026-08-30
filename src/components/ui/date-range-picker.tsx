import * as React from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths, addDays } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PresetKey =
  | "this-week" | "this-month" | "last-week" | "last-month"
  | "last-7" | "last-30" | "last-12w" | "last-12m" | "custom";

const presets: { key: PresetKey; label: string; range: () => DateRange }[] = [
  { key: "this-week", label: "This week", range: () => ({ from: startOfWeek(new Date()), to: endOfWeek(new Date()) }) },
  { key: "this-month", label: "This month", range: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { key: "last-week", label: "Last week", range: () => ({ from: startOfWeek(subWeeks(new Date(), 1)), to: endOfWeek(subWeeks(new Date(), 1)) }) },
  { key: "last-month", label: "Last month", range: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { key: "last-7", label: "Last 7 days", range: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
  { key: "last-30", label: "Last 30 days", range: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
  { key: "last-12w", label: "Last 12 weeks", range: () => ({ from: subWeeks(new Date(), 12), to: new Date() }) },
  { key: "last-12m", label: "Last 12 months", range: () => ({ from: subMonths(new Date(), 12), to: new Date() }) },
];

export interface DateRangePickerProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  className?: string;
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DateRange | undefined>(value);
  const [preset, setPreset] = React.useState<PresetKey>("custom");

  React.useEffect(() => { if (open) { setDraft(value); } }, [open, value]);

  const label = value?.from
    ? value.to && value.to.getTime() !== value.from.getTime()
      ? `${format(value.from, "MMM d")} – ${format(value.to, "MMM d, yyyy")}`
      : format(value.from, "MMM d, yyyy")
    : "Pick a date";

  const apply = () => { onChange(draft); setOpen(false); };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={cn("inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted/50", className)}>
          <CalendarIcon className="size-4" /> {label}
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-popover" align="end">
        <div className="flex">
          <div className="flex flex-col gap-1 border-r border-border p-3 min-w-[150px]">
            {presets.map((p) => (
              <button
                key={p.key}
                onClick={() => { setPreset(p.key); setDraft(p.range()); }}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left hover:bg-muted/60",
                  preset === p.key && "font-semibold"
                )}
              >
                <span className={cn(
                  "size-3.5 rounded-full border flex items-center justify-center",
                  preset === p.key ? "border-foreground" : "border-muted-foreground/40"
                )}>
                  {preset === p.key && <span className="size-1.5 rounded-full bg-foreground" />}
                </span>
                {p.label}
              </button>
            ))}
            <button
              onClick={() => setPreset("custom")}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left hover:bg-muted/60",
                preset === "custom" && "font-semibold"
              )}
            >
              <span className={cn(
                "size-3.5 rounded-full border flex items-center justify-center",
                preset === "custom" ? "border-foreground" : "border-muted-foreground/40"
              )}>
                {preset === "custom" && <span className="size-1.5 rounded-full bg-foreground" />}
              </span>
              Custom
            </button>
          </div>
          <div className="flex flex-col">
            <Calendar
              mode="range"
              selected={draft}
              onSelect={(r) => { setDraft(r); setPreset("custom"); }}
              numberOfMonths={2}
              defaultMonth={draft?.from ?? new Date()}
              className="p-3 pointer-events-auto"
            />
            <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
              <div className="text-sm">
                <span className="font-semibold">Start date:</span>{" "}
                <span className="text-muted-foreground">{draft?.from ? format(draft.from, "MMM d, yy") : "—"}</span>
                <span className="ml-4 font-semibold">End date:</span>{" "}
                <span className="text-muted-foreground">{draft?.to ? format(draft.to, "MMM d, yy") : "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={apply}>Apply</Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
