import { cn } from "@/lib/utils";
import { mainFloorPlan, type FloorItem } from "./FloorPlan";

export type HeatmapProps = {
  requests: Record<string | number, number>;
  className?: string;
};

/** Simple 3-tier heat: low (cool), medium (warm), high (hot). */
function heatColor(t: number): string {
  if (t < 0.34) return "hsl(210 55% 55%)"; // low — calm blue
  if (t < 0.67) return "hsl(35 85% 58%)"; // medium — amber
  return "hsl(0 80% 55%)"; // high — red
}

function heatLabel(t: number): "Low" | "Medium" | "High" {
  if (t < 0.34) return "Low";
  if (t < 0.67) return "Medium";
  return "High";
}

export function TableHeatmap({ requests, className }: HeatmapProps) {
  const items = mainFloorPlan;
  const counts = Object.values(requests);
  const max = Math.max(1, ...counts);
  const width = 1000;
  const height = 560;
  const pct = (v: number, total: number) => `${(v / total) * 100}%`;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-lg border border-border bg-[#1f2329]",
        className,
      )}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {items.map((it, i) => {
        if (it.kind === "plant") {
          return (
            <div
              key={i}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-emerald-500/40 leading-none"
              style={{ left: pct(it.x, width), top: pct(it.y, height), fontSize: 16 }}
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
              className="absolute -translate-x-1/2 bg-white/5"
              style={{
                left: pct(it.x, width),
                top: pct(it.y, height),
                width: 4,
                height: pct(it.h, height),
              }}
            />
          );
        }
        const item = it as Extract<FloorItem, { kind: "round" | "rect" }>;
        const id = "id" in item ? item.id : undefined;
        const size = item.kind === "round" ? (item.size ?? 60) : 0;
        const w = item.kind === "round" ? size : item.w;
        const h = item.kind === "round" ? size : item.h;
        const count = id != null ? (requests[String(id)] ?? 0) : 0;
        const intensity = count / max;
        const hasData = id != null && count > 0;
        const color = hasData ? heatColor(intensity) : "rgba(255,255,255,0.06)";
        const glow = "none";

        return (
          <div
            key={i}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center text-[10px] font-bold transition-all",
              item.kind === "round" ? "rounded-full" : "rounded-md",
            )}
            style={{
              left: pct(item.x, width),
              top: pct(item.y, height),
              width: pct(w, width),
              height: pct(h, height),
              background: color,
              boxShadow: glow,
              color: intensity > 0.4 ? "#fff" : "rgba(255,255,255,0.7)",
              opacity: hasData ? 1 : 0.5,
            }}
            title={id != null ? `Table ${id} — ${count} requests` : undefined}
          >
            {id != null && (
              <>
                <span className="leading-none">{id}</span>
                {hasData && <span className="text-[8px] font-semibold opacity-90 leading-none mt-0.5">{count}</span>}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
