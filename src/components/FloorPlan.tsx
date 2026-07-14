import { cn } from "@/lib/utils";

export type FloorItem =
  | { kind: "round"; id: number | string; x: number; y: number; size?: number; label?: string; time?: string; time2?: string; status?: "free" | "booked" | "alert" }
  | { kind: "rect"; id?: number | string; x: number; y: number; w: number; h: number; label?: string; time?: string; time2?: string; status?: "free" | "booked" | "alert" }
  | { kind: "plant"; x: number; y: number }
  | { kind: "divider"; x: number; y: number; h: number; arrow?: boolean };

export type FloorPlanProps = {
  items: FloorItem[];
  /** logical canvas size — items use these coordinates */
  width?: number;
  height?: number;
  selectedId?: number | string | null;
  onSelect?: (id: number | string) => void;
  className?: string;
  compact?: boolean;
};

/**
 * Restaurant floor plan rendered with absolutely-positioned tables on a dark canvas.
 * Layout follows Libro/OpenTable-style seating diagrams.
 */
export function FloorPlan({
  items,
  width = 1000,
  height = 560,
  selectedId,
  onSelect,
  className,
  compact = false,
}: FloorPlanProps) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-lg border border-border bg-[#2a2f36]",
        className,
      )}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {items.map((it, i) => {
        const pct = (v: number, total: number) => `${(v / total) * 100}%`;

        if (it.kind === "plant") {
          return (
            <div
              key={i}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-emerald-400 leading-none select-none"
              style={{ left: pct(it.x, width), top: pct(it.y, height), fontSize: compact ? 14 : 26 }}
              aria-hidden
            >
              ✺
            </div>
          );
        }

        if (it.kind === "divider") {
          return (
            <div
              key={i}
              className="absolute -translate-x-1/2 bg-[#3a4049] flex flex-col items-center justify-end"
              style={{
                left: pct(it.x, width),
                top: pct(it.y, height),
                width: compact ? 4 : 8,
                height: pct(it.h, height),
              }}
            >
              {it.arrow && (
                <div
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-muted-foreground"
                  style={{ fontSize: compact ? 10 : 16 }}
                  aria-hidden
                >
                  ▼
                </div>
              )}
            </div>
          );
        }

        // round or rect table
        const isSelected = "id" in it && it.id != null && it.id === selectedId;
        const statusBar =
          it.status === "alert"
            ? "bg-red-500"
            : it.status === "booked"
              ? "bg-zinc-700"
              : "bg-zinc-300";
        const baseShape =
          it.kind === "round"
            ? "rounded-full"
            : "rounded-md";
        const size = it.kind === "round" ? (it.size ?? 60) : 0;
        const w = it.kind === "round" ? size : it.w;
        const h = it.kind === "round" ? size : it.h;

        const Wrapper: React.ElementType = onSelect && "id" in it && it.id != null ? "button" : "div";

        return (
          <Wrapper
            key={i}
            type={Wrapper === "button" ? "button" : undefined}
            onClick={
              onSelect && "id" in it && it.id != null
                ? () => onSelect(it.id as number | string)
                : undefined
            }
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center text-[10px] font-semibold text-zinc-800 bg-zinc-300 shadow-sm transition-all",
              baseShape,
              isSelected && "ring-2 ring-success ring-offset-1 ring-offset-[#2a2f36]",
              onSelect && "id" in it && it.id != null && "cursor-pointer hover:brightness-110",
            )}
            style={{
              left: pct(it.x, width),
              top: pct(it.y, height),
              width: pct(w, width),
              height: pct(h, height),
              minWidth: compact ? 14 : 24,
              minHeight: compact ? 14 : 24,
            }}
          >
            {"id" in it && it.id != null && (
              <span
                className={cn(
                  "absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-1/2 px-1.5 rounded-sm text-[9px] leading-tight",
                  statusBar,
                  it.status === "alert" ? "text-white" : "text-zinc-800",
                )}
                style={{ fontSize: compact ? 8 : 10 }}
              >
                {"label" in it && it.label ? it.label : it.id}
              </span>
            )}
            {(it.time || it.time2) && (
              <div
                className="flex flex-col items-center gap-0.5 mt-1 text-white"
                style={{ fontSize: compact ? 7 : 10 }}
              >
                {it.time && (
                  <span className="bg-black/80 px-1.5 rounded-sm leading-tight">{it.time}</span>
                )}
                {it.time2 && (
                  <span className="bg-black/80 px-1.5 rounded-sm leading-tight">{it.time2}</span>
                )}
              </div>
            )}
          </Wrapper>
        );
      })}
    </div>
  );
}

/** Main dining room layout based on the Libro reference. */
export const mainFloorPlan: FloorItem[] = [
  // Center vertical divider with entry arrow
  { kind: "divider", x: 500, y: 60, h: 480, arrow: true },

  // ----- LEFT SIDE (500s) -----
  // Row 1
  { kind: "round", id: 504, x: 110, y: 130, time: "9:00P" },
  { kind: "round", id: 505, x: 210, y: 130, time: "6:30P", time2: "9:00P" },
  { kind: "round", id: 512, x: 310, y: 130, time: "6:30P", time2: "9:00P", status: "alert" },
  // Row 2
  { kind: "round", id: 503, x: 110, y: 220, time: "9:00P" },
  { kind: "round", id: 511, x: 310, y: 220, time: "6:30P", time2: "9:00P", status: "alert" },
  // Row 3 — big booth in the middle
  { kind: "round", id: 502, x: 110, y: 310, time: "9:00P" },
  { kind: "rect", id: 506, x: 210, y: 310, w: 80, h: 130, time: "9:00P" },
  { kind: "round", id: 510, x: 310, y: 310, time: "6:30P", time2: "9:00P", status: "alert" },
  // Row 4
  { kind: "round", id: 501, x: 110, y: 405, time: "9:00P" },
  { kind: "round", id: 509, x: 310, y: 405, time: "6:30P", time2: "9:00P", status: "alert" },
  // Row 5
  { kind: "round", id: 500, x: 110, y: 495, time: "9:00P" },
  { kind: "round", id: 507, x: 210, y: 495, time: "7:00P", time2: "9:00P" },
  { kind: "round", id: 508, x: 310, y: 495 },
  // Two rectangular tables far left bottom
  { kind: "rect", id: 514, x: 175, y: 545, w: 56, h: 70, time: "6:00P", status: "alert" },
  { kind: "rect", id: 513, x: 245, y: 545, w: 56, h: 70, time: "7:00P" },

  // ----- MIDDLE COLUMN (4-tops near aisle) -----
  { kind: "round", id: 423, x: 410, y: 200, time: "7:00P" },
  { kind: "round", id: 422, x: 500, y: 200 },
  { kind: "round", id: 419, x: 410, y: 310 },
  { kind: "round", id: 418, x: 500, y: 310, size: 50, time: "8:15P" },
  { kind: "round", id: 411, x: 410, y: 405, size: 50, time: "8:00P" },
  { kind: "round", id: 410, x: 500, y: 405, size: 50, time: "8:30P" },

  // ----- RIGHT SIDE (400s) -----
  // Top — large booth + two rounds
  { kind: "rect", x: 660, y: 130, w: 200, h: 80 },
  { kind: "round", id: 421, x: 800, y: 130, time: "7:30P" },
  { kind: "round", id: 420, x: 900, y: 130, time: "6:00P" },

  // Plant row
  ...[600, 670, 740, 810, 880, 950].map<FloorItem>((x) => ({ kind: "plant", x, y: 280 })),

  // Row of 6 small rounds (417-412)
  ...[417, 416, 415, 414, 413, 412].map<FloorItem>((id, idx) => ({
    kind: "round",
    id,
    x: 600 + idx * 70,
    y: 230,
    size: 48,
    time: id === 412 ? undefined : "9:00P",
  })),

  // Row of 6 (409-404)
  ...[409, 408, 407, 406, 405, 404].map<FloorItem>((id, idx) => ({
    kind: "round",
    id,
    x: 600 + idx * 70,
    y: 350,
    size: 50,
    time: "4:00P",
    time2: "9:00P",
  })),

  // Bottom row (403-400)
  { kind: "round", id: 403, x: 620, y: 480, size: 70, time: "7:15P" },
  { kind: "round", id: 402, x: 730, y: 480, size: 70 },
  { kind: "round", id: 401, x: 840, y: 480, size: 70, time: "8:15P" },
  { kind: "round", id: 400, x: 950, y: 480, size: 70, time: "7:30P" },
];
