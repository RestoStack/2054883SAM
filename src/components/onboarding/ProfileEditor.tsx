import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PhotoUpload } from "./PhotoUpload";

export type ProfileRestaurant = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  cuisine: string | null;
  website: string | null;
  logo_url: string | null;
  cover_url: string | null;
};

export function ProfileEditor({
  restaurant,
  onSaved,
  ctaLabel = "Save",
}: {
  restaurant: ProfileRestaurant;
  onSaved?: (r: ProfileRestaurant) => void;
  ctaLabel?: string;
}) {
  const [name, setName] = useState(restaurant.name);
  const [address, setAddress] = useState(restaurant.address ?? "");
  const [city, setCity] = useState(restaurant.city ?? "");
  const [phone, setPhone] = useState(restaurant.phone ?? "");
  const [cuisine, setCuisine] = useState(restaurant.cuisine ?? "");
  const [website, setWebsite] = useState(restaurant.website ?? "");
  const [logoUrl, setLogoUrl] = useState(restaurant.logo_url);
  const [coverUrl, setCoverUrl] = useState(restaurant.cover_url);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) { toast.error("Restaurant name is required"); return; }
    setBusy(true);
    const { data, error } = await supabase
      .from("v2_restaurants")
      .update({
        name,
        address: address || null,
        city: city || null,
        phone: phone || null,
        cuisine: cuisine || null,
        website: website || null,
      })
      .eq("id", restaurant.id)
      .select("id,name,slug,city,address,phone,cuisine,website,logo_url,cover_url")
      .single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile saved");
    onSaved?.(data as ProfileRestaurant);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4">
        <PhotoUpload restaurantId={restaurant.id} kind="logo" url={logoUrl} onChange={setLogoUrl}
          aspect="square" label="Logo" hint="Square, PNG or JPG" />
        <PhotoUpload restaurantId={restaurant.id} kind="cover" url={coverUrl} onChange={setCoverUrl}
          aspect="video" label="Cover photo" hint="Dining room / storefront shot" />
      </div>
      <Field label="Restaurant name *" value={name} onChange={setName} />
      <Field label="Address" value={address} onChange={setAddress} placeholder="240 Greenwich Ave" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="City / neighborhood" value={city} onChange={setCity} placeholder="Brooklyn, NY" />
        <Field label="Phone" value={phone} onChange={setPhone} placeholder="(555) 010-2030" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cuisine" value={cuisine} onChange={setCuisine} placeholder="Italian, Wine bar" />
        <Field label="Website" value={website} onChange={setWebsite} placeholder="https://" />
      </div>
      <div className="flex justify-end">
        <button onClick={save} disabled={busy || !name.trim()} className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-success-foreground disabled:opacity-60">
          {busy && <Loader2 className="size-4 animate-spin" />} {ctaLabel}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
    </label>
  );
}
