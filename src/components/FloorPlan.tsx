import { cn } from "@/lib/utils";
import type { DragEvent } from "react";

export type FloorTableStatus = "free" | "booked" | "seated" | "alert";

export type FloorItem =
  | {
      kind: "round";
      id: number | string;
      x: number;
      y: number;
      size?: number;
      label?: string;
      time?: string;
      time2?: string;
      guest?: string;
      party?: number;
      status?: FloorTableStatus;
    }
  | {
      kind: "rect";
      id?: number | string;
      x: number;
      y: number;
      w: number;
      h: number;
      label?: string;
      time?: string;
      time2?: string;
      guest?: string;
      party?: number;
      status?: FloorTableStatus;
    }
  | { kind: "plant"; x: number; y: number }
  | { kind: "divider"; x: number; y: number; h: number; arrow?: boolean };

export type FloorPlanProps = {
  items: FloorItem[];
  /** logical canvas size — items use these coordinates */
  width?: number;
  height?: number;
  selectedId?: number | string | null;
  onSelect?: (id: number | string) => void;
  /** HTML5 drop: party dragged from sidebar onto a table */
  onDropParty?: (tableId: number | string, raw: string) => void;
  /** Drag tables to rearrange spaces (returns new logical coords) */
  onMoveTable?: (tableId: number | string, x: number, y: number) => void;
  className?: string;
  compact?: boolean;
  /** Scale factor for zoom (1 = 100%) */
  zoom?: number;
  /** Stretch to parent width/height instead of locked aspect-ratio box */
  fill?: boolean;
};

const statusFill: Record<FloorTableStatus, string> = {
  free: "bg-zinc-300 text-zinc-800",
  booked: "bg-violet-200 text-violet-950",
  seated: "bg-violet-600 text-white",
  alert: "bg-rose-400 text-white",
};

/**
 * Restaurant floor plan — OpenTable / hostess-style seating map.
 */
export function FloorPlan({
  items,
  width = 1000,
  height = 560,
  selectedId,
  onSelect,
  onDropParty,
  onMoveTable,
  className,
  compact = false,
  zoom = 1,
  fill = false,
}: FloorPlanProps) {
  const pct = (v: number, total: number) => `${(v / total) * 100}%`;

  const handleDragOver = (e: DragEvent) => {
    if (!onDropParty) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[#2a2f36]",
        fill
          ? "h-full w-full rounded-none border-0"
          : "w-full rounded-xl border border-zinc-700/80",
        className,
      )}
      style={{
        ...(fill ? {} : { aspectRatio: `${width} / ${height}` }),
        transform: zoom !== 1 ? `scale(${zoom})` : undefined,
        transformOrigin: "center center",
      }}
    >
      {/* subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {items.map((it, i) => {
        if (it.kind === "plant") {
          return (
            <div
              key={i}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-emerald-400/80 leading-none select-none"
              style={{ left: pct(it.x, width), top: pct(it.y, height), fontSize: compact ? 14 : 22 }}
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

        const id = it.id;
        if (id == null) {
          return (
            <div
              key={i}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-md bg-zinc-600/40 border border-zinc-500/30"
              style={{
                left: pct(it.x, width),
                top: pct(it.y, height),
                width: pct(it.w, width),
                height: pct(it.h, height),
              }}
            />
          );
        }

        const status: FloorTableStatus = it.status ?? "free";
        const isSelected = id === selectedId;
        const baseShape = it.kind === "round" ? "rounded-full" : "rounded-md";
        const size = it.kind === "round" ? (it.size ?? 60) : 0;
        const w = it.kind === "round" ? size : it.w;
        const h = it.kind === "round" ? size : it.h;

        return (
          <button
            key={i}
            type="button"
            draggable={!!onMoveTable}
            onDragStart={(e) => {
              if (!onMoveTable) return;
              e.dataTransfer.setData("application/x-table-id", String(id));
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={handleDragOver}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const party = e.dataTransfer.getData("application/x-party");
              if (party && onDropParty) {
                onDropParty(id, party);
                return;
              }
            }}
            onClick={() => onSelect?.(id)}
            className={cn(
              "absolute z-10 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center font-semibold shadow-md transition-all border border-black/10",
              baseShape,
              statusFill[status],
              isSelected && "ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#2a2f36] scale-105",
              onSelect && "cursor-pointer hover:brightness-110",
              onMoveTable && "cursor-grab active:cursor-grabbing",
            )}
            style={{
              left: pct(it.x, width),
              top: pct(it.y, height),
              width: pct(w, width),
              height: pct(h, height),
              minWidth: compact ? 18 : 28,
              minHeight: compact ? 18 : 28,
              fontSize: compact ? 9 : 12,
            }}
            title={it.guest ? `${it.label ?? id} · ${it.guest}` : String(it.label ?? id)}
          >
            <span className="leading-none">{it.label ?? id}</span>
            {it.guest && (
              <span
                className="mt-0.5 max-w-[90%] truncate px-0.5 opacity-90 font-medium"
                style={{ fontSize: compact ? 7 : 9 }}
              >
                {it.guest}
              </span>
            )}
            {(it.time || it.time2) && (
              <div
                className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 pointer-events-none"
                style={{ fontSize: compact ? 7 : 9 }}
              >
                {it.time && (
                  <span className="bg-black/85 text-white px-1.5 rounded-sm leading-tight whitespace-nowrap">
                    {it.time}
                  </span>
                )}
                {it.time2 && (
                  <span className="bg-black/85 text-white px-1.5 rounded-sm leading-tight whitespace-nowrap">
                    {it.time2}
                  </span>
                )}
              </div>
            )}
          </button>
        );
      })}

      {/* Canvas drop zone for repositioning tables (behind tables via z-index) */}
      {onMoveTable && (
        <div
          className="absolute inset-0 z-0"
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("application/x-table-id")) {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }
          }}
          onDrop={(e) => {
            const tableId = e.dataTransfer.getData("application/x-table-id");
            if (!tableId) return;
            e.preventDefault();
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * width;
            const y = ((e.clientY - rect.top) / rect.height) * height;
            onMoveTable(tableId, Math.round(x), Math.round(y));
          }}
        />
      )}
    </div>
  );
}

/** Main dining room layout based on hostess FoH reference. */
export const mainFloorPlan: FloorItem[] = [
  { kind: "divider", x: 500, y: 60, h: 480, arrow: true },

  { kind: "round", id: 504, x: 110, y: 130, time: "9:00P" },
  { kind: "round", id: 505, x: 210, y: 130, time: "6:30P", time2: "9:00P" },
  { kind: "round", id: 512, x: 310, y: 130, time: "6:30P", time2: "9:00P", status: "alert" },
  { kind: "round", id: 503, x: 110, y: 220, time: "9:00P" },
  { kind: "round", id: 511, x: 310, y: 220, time: "6:30P", time2: "9:00P", status: "alert" },
  { kind: "round", id: 502, x: 110, y: 310, time: "9:00P" },
  { kind: "rect", id: 506, x: 210, y: 310, w: 80, h: 130, time: "9:00P" },
  { kind: "round", id: 510, x: 310, y: 310, time: "6:30P", time2: "9:00P", status: "alert" },
  { kind: "round", id: 501, x: 110, y: 405, time: "9:00P" },
  { kind: "round", id: 509, x: 310, y: 405, time: "6:30P", time2: "9:00P", status: "alert" },
  { kind: "round", id: 500, x: 110, y: 495, time: "9:00P" },
  { kind: "round", id: 507, x: 210, y: 495, time: "7:00P", time2: "9:00P" },
  { kind: "round", id: 508, x: 310, y: 495 },
  { kind: "rect", id: 514, x: 175, y: 545, w: 56, h: 70, time: "6:00P", status: "alert" },
  { kind: "rect", id: 513, x: 245, y: 545, w: 56, h: 70, time: "7:00P" },

  { kind: "round", id: 423, x: 410, y: 200, time: "7:00P" },
  { kind: "round", id: 422, x: 500, y: 200 },
  { kind: "round", id: 419, x: 410, y: 310 },
  { kind: "round", id: 418, x: 500, y: 310, size: 50, time: "8:15P" },
  { kind: "round", id: 411, x: 410, y: 405, size: 50, time: "8:00P" },
  { kind: "round", id: 410, x: 500, y: 405, size: 50, time: "8:30P" },

  { kind: "rect", x: 660, y: 130, w: 200, h: 80 },
  { kind: "round", id: 421, x: 800, y: 130, time: "7:30P" },
  { kind: "round", id: 420, x: 900, y: 130, time: "6:00P" },

  ...[600, 670, 740, 810, 880, 950].map<FloorItem>((x) => ({ kind: "plant", x, y: 280 })),

  ...[417, 416, 415, 414, 413, 412].map<FloorItem>((id, idx) => ({
    kind: "round",
    id,
    x: 600 + idx * 70,
    y: 230,
    size: 48,
    time: id === 412 ? undefined : "9:00P",
  })),

  ...[409, 408, 407, 406, 405, 404].map<FloorItem>((id, idx) => ({
    kind: "round",
    id,
    x: 600 + idx * 70,
    y: 350,
    size: 50,
    time: "4:00P",
    time2: "9:00P",
  })),

  { kind: "round", id: 403, x: 620, y: 480, size: 70, time: "7:15P" },
  { kind: "round", id: 402, x: 730, y: 480, size: 70 },
  { kind: "round", id: 401, x: 840, y: 480, size: 70, time: "8:15P" },
  { kind: "round", id: 400, x: 950, y: 480, size: 70, time: "7:30P" },
];
