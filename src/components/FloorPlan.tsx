import { useRef, type DragEvent, type PointerEvent as ReactPointerEvent } from "react";
import { cn } from "@/lib/utils";

export type FloorStatus = "free" | "booked" | "alert" | "seated" | "waiting";
export type FloorTableStatus = FloorStatus;

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
      status?: FloorStatus;
      guest?: string;
      guestLabel?: string;
      party?: number;
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
      status?: FloorStatus;
      guest?: string;
      guestLabel?: string;
      party?: number;
    }
  | { kind: "plant"; x: number; y: number }
  | { kind: "divider"; x: number; y: number; h: number; arrow?: boolean };

export type FloorPlanProps = {
  items: FloorItem[];
  width?: number;
  height?: number;
  selectedId?: number | string | null;
  onSelect?: (id: number | string) => void;
  onDropParty?: (tableId: number | string, raw?: string) => void;
  onMoveTable?: (tableId: number | string, x: number, y: number) => void;
  onTableMove?: (id: number | string, x: number, y: number) => void;
  movable?: boolean;
  zoom?: number;
  className?: string;
  compact?: boolean;
  /** Stretch to fill parent — no fixed pixel box / gutters */
  fill?: boolean;
  /** Light canvas for dashboard Host Stand */
  light?: boolean;
};

/** Mockup: Available grey, Reserved blue, Seated green, Waiting orange, Late red */
const statusFillLight: Record<FloorStatus, string> = {
  free: "bg-[#9CA3AF] text-white",
  booked: "bg-[#3B82F6] text-white",
  seated: "bg-[#00A36C] text-white",
  waiting: "bg-[#F59E0B] text-white",
  alert: "bg-[#EF4444] text-white",
};

const statusFillDark: Record<FloorStatus, string> = {
  free: "bg-[#6B7280] text-white",
  booked: "bg-[#2563EB] text-white",
  seated: "bg-[#059669] text-white",
  waiting: "bg-[#D97706] text-white",
  alert: "bg-[#DC2626] text-white",
};

/**
 * Hostess floor plan. Use `fill` on Host Stand so the map spans the whole pane.
 */
export function FloorPlan({
  items,
  width = 1000,
  height = 560,
  selectedId,
  onSelect,
  onDropParty,
  onMoveTable,
  onTableMove,
  movable = false,
  zoom = 1,
  className,
  compact = false,
  fill = false,
  light = false,
}: FloorPlanProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: number | string; offX: number; offY: number } | null>(null);
  const moveHandler = onTableMove ?? onMoveTable;

  const pct = (v: number, total: number) => `${(v / total) * 100}%`;

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!dragRef.current || !canvasRef.current || !moveHandler) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left - dragRef.current.offX;
    const py = e.clientY - rect.top - dragRef.current.offY;
    const nx = Math.max(30, Math.min(width - 30, (px / rect.width) * width));
    const ny = Math.max(30, Math.min(height - 30, (py / rect.height) * height));
    moveHandler(dragRef.current.id, Math.round(nx), Math.round(ny));
  };

  return (
    <div
      ref={canvasRef}
      onPointerMove={onPointerMove}
      onPointerUp={() => {
        dragRef.current = null;
      }}
      onPointerLeave={() => {
        dragRef.current = null;
      }}
      className={cn(
        "relative overflow-hidden touch-none select-none",
        light ? "bg-[#E8E4DC]" : "bg-[#1a1d22]",
        fill
          ? "h-full w-full rounded-none border-0"
          : light
            ? "rounded-xl border border-slate-200"
            : "rounded-lg border border-zinc-700/80",
        className,
      )}
      style={
        fill
          ? { width: "100%", height: "100%" }
          : {
              width: width * zoom,
              height: height * zoom,
              maxWidth: "100%",
            }
      }
    >
      <div
        className={cn("absolute inset-0", fill && zoom !== 1 && "origin-center")}
        style={
          fill
            ? zoom !== 1
              ? { transform: `scale(${zoom})` }
              : undefined
            : {
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
                width,
                height,
              }
        }
      >
        {/* subtle wood / grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: light
              ? "linear-gradient(#8B7355 1px, transparent 1px), linear-gradient(90deg, #8B7355 1px, transparent 1px)"
              : "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {items.map((it, i) => {
          if (it.kind === "plant") {
            return (
              <div
                key={i}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 leading-none select-none",
                  light ? "text-emerald-600" : "text-emerald-400",
                )}
                style={{
                  left: pct(it.x, width),
                  top: pct(it.y, height),
                  fontSize: compact ? 14 : fill ? 22 : 26,
                }}
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
                className={cn(
                  "absolute -translate-x-1/2 flex flex-col items-center justify-end",
                  light ? "bg-[#C4B8A8]" : "bg-[#3a4049]",
                )}
                style={{
                  left: pct(it.x, width),
                  top: pct(it.y, height),
                  width: compact ? 4 : 8,
                  height: pct(it.h, height),
                }}
              >
                {it.arrow && (
                  <div
                    className={cn(
                      "absolute -bottom-2 left-1/2 -translate-x-1/2",
                      light ? "text-stone-400" : "text-zinc-500",
                    )}
                    style={{ fontSize: compact ? 10 : 16 }}
                    aria-hidden
                  >
                    ▼
                  </div>
                )}
              </div>
            );
          }

          const hasId = it.id != null;
          if (!hasId) {
            const rw = it.kind === "rect" ? it.w : 60;
            const rh = it.kind === "rect" ? it.h : 60;
            return (
              <div
                key={i}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 rounded-md border",
                  light
                    ? "bg-stone-300/50 border-stone-400/30"
                    : "bg-zinc-600/35 border-zinc-500/20",
                )}
                style={{
                  left: pct(it.x, width),
                  top: pct(it.y, height),
                  width: pct(rw, width),
                  height: pct(rh, height),
                }}
              />
            );
          }

          const id = it.id as number | string;
          const status: FloorStatus = it.status ?? "free";
          const isSelected = id === selectedId;
          const shape = it.kind === "round" ? "rounded-full" : "rounded-md";
          const size = it.kind === "round" ? (it.size ?? 64) : 0;
          const w = it.kind === "round" ? size : it.w;
          const h = it.kind === "round" ? size : it.h;
          const guest = it.guestLabel ?? it.guest;
          const canDrop = !!onDropParty && status !== "seated";
          const fillCls = (light ? statusFillLight : statusFillDark)[status];
          const showInlineMeta = !!guest || !!it.time;

          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect?.(id)}
              onPointerDown={(e) => {
                if (!movable || !moveHandler) return;
                (e.target as Element).setPointerCapture?.(e.pointerId);
                const rect = canvasRef.current!.getBoundingClientRect();
                const px = (it.x / width) * rect.width;
                const py = (it.y / height) * rect.height;
                dragRef.current = {
                  id,
                  offX: e.clientX - rect.left - px,
                  offY: e.clientY - rect.top - py,
                };
              }}
              onDragOver={(e: DragEvent) => {
                if (!canDrop) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e: DragEvent) => {
                if (!canDrop) return;
                e.preventDefault();
                const raw = e.dataTransfer.getData("application/x-party");
                onDropParty?.(id, raw || undefined);
              }}
              className={cn(
                "absolute z-10 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center font-semibold shadow-md transition-all border border-black/10",
                shape,
                fillCls,
                isSelected &&
                  (light
                    ? "ring-2 ring-[#00A36C] ring-offset-2 ring-offset-[#E8E4DC] scale-105"
                    : "ring-2 ring-[#39D400] ring-offset-2 ring-offset-[#1a1d22] scale-105"),
                onSelect && "cursor-pointer hover:brightness-110",
                movable && "cursor-grab active:cursor-grabbing",
              )}
              style={{
                left: pct(it.x, width),
                top: pct(it.y, height),
                width: pct(w, width),
                height: pct(h, height),
                minWidth: fill ? 32 : compact ? 14 : 28,
                minHeight: fill ? 32 : compact ? 14 : 28,
                fontSize: fill ? 12 : compact ? 9 : 11,
              }}
              title={
                guest
                  ? `${it.label ?? id} · ${guest}${it.time ? ` · ${it.time}` : ""}`
                  : String(it.label ?? id)
              }
            >
              <span className="leading-none font-bold">{it.label ?? id}</span>
              {showInlineMeta && (
                <span
                  className="mt-0.5 max-w-[92%] truncate px-0.5 opacity-95 leading-tight text-center"
                  style={{ fontSize: fill ? 9 : 8 }}
                >
                  {guest && it.time && status !== "seated"
                    ? `${guest} · ${it.time}`
                    : guest || it.time}
                </span>
              )}
              {!showInlineMeta && it.time2 && (
                <div
                  className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 pointer-events-none"
                  style={{ fontSize: 9 }}
                >
                  <span className="bg-black/80 text-white px-1.5 rounded-sm leading-tight whitespace-nowrap">
                    {it.time2}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Fit table positions into the canvas so sparse DB layouts don't leave
 * a huge empty band under a clustered top row.
 */
export function normalizeFloorLayout(
  items: FloorItem[],
  width = 1000,
  height = 560,
  padding = 56,
): FloorItem[] {
  const placed = items.filter(
    (it): it is Extract<FloorItem, { kind: "round" | "rect" }> =>
      (it.kind === "round" || it.kind === "rect") && it.id != null,
  );
  if (placed.length === 0) return items;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const t of placed) {
    const hw = t.kind === "round" ? (t.size ?? 64) / 2 : t.w / 2;
    const hh = t.kind === "round" ? (t.size ?? 64) / 2 : t.h / 2;
    minX = Math.min(minX, t.x - hw);
    maxX = Math.max(maxX, t.x + hw);
    minY = Math.min(minY, t.y - hh);
    maxY = Math.max(maxY, t.y + hh);
  }

  const contentW = Math.max(40, maxX - minX);
  const contentH = Math.max(40, maxY - minY);
  const availW = Math.max(80, width - padding * 2);
  const availH = Math.max(80, height - padding * 2);
  // Fill the pane when tables are clustered; never shrink past reading size.
  const scale = Math.min(availW / contentW, availH / contentH);
  const usedW = contentW * scale;
  const usedH = contentH * scale;
  const originX = (width - usedW) / 2;
  const originY = (height - usedH) / 2;

  const mapPoint = (x: number, y: number) => ({
    x: Math.round(originX + (x - minX) * scale),
    y: Math.round(originY + (y - minY) * scale),
  });

  return items.map((it) => {
    if (it.kind === "plant") {
      const p = mapPoint(it.x, it.y);
      return { ...it, x: p.x, y: p.y };
    }
    if (it.kind === "divider") {
      const p = mapPoint(it.x, it.y);
      return { ...it, x: p.x, y: p.y, h: Math.max(24, Math.round(it.h * scale)) };
    }
    if (it.kind === "round") {
      const p = mapPoint(it.x, it.y);
      const size = Math.max(36, Math.round((it.size ?? 64) * Math.min(scale, 1.25)));
      return { ...it, x: p.x, y: p.y, size };
    }
    if (it.kind === "rect") {
      const p = mapPoint(it.x, it.y);
      return {
        ...it,
        x: p.x,
        y: p.y,
        w: Math.max(40, Math.round(it.w * Math.min(scale, 1.25))),
        h: Math.max(36, Math.round(it.h * Math.min(scale, 1.25))),
      };
    }
    return it;
  });
}

/** Demo layout fallback when no saved table positions exist. */
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
