import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, Image as ImageIcon, Trash2 } from "lucide-react";

export function PhotoUpload({
  restaurantId, kind, url, onChange, aspect, label, hint,
}: {
  restaurantId: string;
  kind: "logo" | "cover";
  url: string | null;
  onChange: (u: string | null) => void;
  aspect: "square" | "video";
  label: string;
  hint: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB"); return; }
    setBusy(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${restaurantId}/${kind}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("restaurant-media").upload(path, file, {
      contentType: file.type,
      upsert: true,
    });
    if (upErr) { setBusy(false); toast.error(upErr.message); return; }
    const { data } = supabase.storage.from("restaurant-media").getPublicUrl(path);
    // Persist to restaurant row so it survives reloads
    const patch = kind === "logo" ? { logo_url: data.publicUrl } : { cover_url: data.publicUrl };
    await supabase.from("v2_restaurants").update(patch).eq("id", restaurantId);
    onChange(data.publicUrl);
    setBusy(false);
    toast.success(`${label} uploaded`);
  };

  const remove = async () => {
    const patch = kind === "logo" ? { logo_url: null } : { cover_url: null };
    await supabase.from("v2_restaurants").update(patch).eq("id", restaurantId);
    onChange(null);
  };

  return (
    <div>
      <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">{label}</div>
      <div
        className={`relative rounded-xl border border-dashed border-border bg-muted/30 overflow-hidden ${aspect === "square" ? "aspect-square w-40" : "aspect-video w-full"}`}
      >
        {url ? (
          <img src={url} alt={label} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-1">
            <ImageIcon className="size-6" />
            <span className="text-[11px]">{hint}</span>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <Loader2 className="size-5 animate-spin" />
          </div>
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted">
          <Upload className="size-3.5" /> {url ? "Replace" : "Upload"}
        </button>
        {url && (
          <button type="button" onClick={remove}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-destructive">
            <Trash2 className="size-3.5" /> Remove
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={onFile} />
    </div>
  );
}
