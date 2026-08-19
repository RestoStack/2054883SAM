import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Download,
  File as FileIcon,
  FileText,
  Image as ImageIcon,
  Loader2,
  Lock,
  Trash2,
  Upload,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { settingsListLocations } from "@/lib/settings-api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type MenuAsset = {
  id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  byte_size: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function fileIcon(mime: string) {
  if (mime === "application/pdf") return FileText;
  if (mime.startsWith("image/")) return ImageIcon;
  return FileIcon;
}

export function SettingsMenu() {
  const { org } = useAuth();
  const orgId = org.activeOrganizationId;
  const canManage = org.role === "owner" || org.role === "manager" || !org.available;

  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [locationId, setLocationId] = useState<string>("");
  const [assets, setAssets] = useState<MenuAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    (async () => {
      const res = await settingsListLocations(orgId);
      const locs = (res.ok && Array.isArray(res.locations) ? res.locations : []) as Array<{
        id: string;
        name: string;
      }>;
      setLocations(locs);
      setLocationId((prev) => prev || org.activeLocationId || locs[0]?.id || "");
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const refreshAssets = useCallback(async () => {
    if (!locationId) {
      setAssets([]);
      return;
    }
    const { data, error } = await (supabase as any)
      .from("menu_assets")
      .select(
        "id, storage_path, file_name, mime_type, byte_size, sort_order, is_active, created_at",
      )
      .eq("location_id", locationId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      toast.error(error.message);
      return;
    }
    setAssets((data ?? []) as MenuAsset[]);
  }, [locationId]);

  useEffect(() => {
    void refreshAssets();
  }, [refreshAssets]);

  const uploadFile = async (file: File) => {
    if (!orgId || !locationId) {
      toast.error("Choose a location first");
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only PDF, JPG, or PNG files are allowed");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("File must be 10MB or smaller");
      return;
    }
    setUploading(true);
    try {
      const uuid =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${orgId}/${locationId}/${uuid}-${safeName}`;
      const { error: upErr } = await supabase.storage.from("menus").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) {
        toast.error(upErr.message);
        return;
      }
      const { error: insErr } = await (supabase as any).from("menu_assets").insert({
        organization_id: orgId,
        location_id: locationId,
        storage_path: path,
        file_name: file.name,
        mime_type: file.type,
        byte_size: file.size,
        sort_order: assets.length,
        is_active: assets.length === 0,
      });
      if (insErr) {
        toast.error(insErr.message);
        await supabase.storage.from("menus").remove([path]);
        return;
      }
      toast.success("Menu uploaded");
      await refreshAssets();
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  };

  const onBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void uploadFile(file);
  };

  const setActive = async (asset: MenuAsset) => {
    if (!locationId) return;
    setBusyId(asset.id);
    const { error: clearErr } = await (supabase as any)
      .from("menu_assets")
      .update({ is_active: false })
      .eq("location_id", locationId);
    if (clearErr) {
      toast.error(clearErr.message);
      setBusyId(null);
      return;
    }
    const { error: setErr } = await (supabase as any)
      .from("menu_assets")
      .update({ is_active: true })
      .eq("id", asset.id);
    setBusyId(null);
    if (setErr) {
      toast.error(setErr.message);
      return;
    }
    toast.success(`"${asset.file_name}" is now the active menu`);
    await refreshAssets();
  };

  const removeAsset = async (asset: MenuAsset) => {
    setBusyId(asset.id);
    const { error: delErr } = await (supabase as any)
      .from("menu_assets")
      .delete()
      .eq("id", asset.id);
    if (delErr) {
      toast.error(delErr.message);
      setBusyId(null);
      return;
    }
    await supabase.storage.from("menus").remove([asset.storage_path]);
    setBusyId(null);
    toast.success("Menu removed");
    await refreshAssets();
  };

  const openAsset = async (asset: MenuAsset) => {
    const { data, error } = await supabase.storage
      .from("menus")
      .createSignedUrl(asset.storage_path, 60);
    if (error || !data?.signedUrl) {
      toast.error(error?.message ?? "Could not open file");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="size-4 animate-spin" /> Loading menu…
      </div>
    );
  }

  if (!orgId) return <p className="text-sm text-muted-foreground">No organization selected.</p>;

  if (!canManage) {
    return (
      <div className="max-w-xl">
        <h2 className="text-lg font-semibold">Menu</h2>
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          <Lock className="size-5 shrink-0" />
          Only owners and managers can upload or manage menu files.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Menu</h2>
          <p className="text-sm text-muted-foreground">
            Upload a PDF, JPG, or PNG (max 10MB) and mark one as active per location.
          </p>
        </div>
        {locations.length > 1 && (
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger className="w-[190px] h-9 text-sm">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {!locationId ? (
        <p className="text-sm text-muted-foreground">
          Add a location in Settings → Locations first.
        </p>
      ) : (
        <>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
              dragOver ? "border-primary bg-accent/40" : "border-border hover:bg-muted/30"
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-6 animate-spin" /> Uploading…
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                <Upload className="size-6" />
                <span>
                  <span className="font-semibold text-foreground">Click to upload</span> or drag and
                  drop
                </span>
                <span className="text-xs">PDF, JPG, or PNG · up to 10MB</span>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/jpg"
              hidden
              onChange={onBrowse}
            />
          </div>

          <div className="space-y-2">
            {assets.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No menu files uploaded for this location yet.
              </p>
            )}
            {assets.map((a) => {
              const Icon = fileIcon(a.mime_type);
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
                >
                  <button
                    type="button"
                    onClick={() => void openAsset(a)}
                    className="flex items-center gap-3 min-w-0 text-left flex-1"
                  >
                    <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Icon className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate flex items-center gap-2">
                        {a.file_name}
                        {a.is_active && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 text-success text-[10px] font-semibold px-2 py-0.5">
                            <CheckCircle2 className="size-3" /> Active
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatBytes(a.byte_size)} · {new Date(a.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      title="Download / view"
                      onClick={() => void openAsset(a)}
                      className="size-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground"
                    >
                      <Download className="size-4" />
                    </button>
                    {!a.is_active && (
                      <button
                        type="button"
                        disabled={busyId === a.id}
                        onClick={() => void setActive(a)}
                        className="text-xs font-semibold px-2.5 py-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-50"
                      >
                        Set active
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyId === a.id}
                      onClick={() => void removeAsset(a)}
                      className="size-8 rounded-md hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive disabled:opacity-50"
                      aria-label={`Delete ${a.file_name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
