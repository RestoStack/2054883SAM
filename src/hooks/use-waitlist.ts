import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type WaitlistStatus = "waiting" | "notified" | "seated" | "cancelled";

export type WaitlistEntry = {
  id: string;
  guest_name: string;
  party_size: number;
  phone: string | null;
  quoted_wait_minutes: number | null;
  status: WaitlistStatus;
  created_at: string;
  table_id?: string | null;
};

const STORAGE_KEY = "restostack_waitlist_v1";

function loadEntries(): WaitlistEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WaitlistEntry[];
  } catch {
    return [];
  }
}

function saveEntries(entries: WaitlistEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

/**
 * Host-stand waitlist. There is no dedicated waitlist table in Supabase yet,
 * so entries are persisted in localStorage for a working local experience.
 */
export function useWaitlist() {
  return useQuery({
    queryKey: ["waitlist"],
    queryFn: async (): Promise<WaitlistEntry[]> => loadEntries(),
  });
}

export type AddWaitlistInput = {
  guest_name: string;
  party_size: number;
  phone?: string;
  quoted_wait_minutes?: number;
};

export function useAddWaitlistEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddWaitlistInput): Promise<WaitlistEntry> => {
      const entry: WaitlistEntry = {
        id: crypto.randomUUID(),
        guest_name: input.guest_name,
        party_size: input.party_size,
        phone: input.phone ?? null,
        quoted_wait_minutes: input.quoted_wait_minutes ?? 15,
        status: "waiting",
        created_at: new Date().toISOString(),
      };
      const next = [...loadEntries(), entry];
      saveEntries(next);
      return entry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["waitlist"] });
    },
  });
}

export function useSeatWaitlistEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, tableId }: { id: string; tableId: string }) => {
      const entries = loadEntries();
      const next = entries.map((e) =>
        e.id === id ? { ...e, status: "seated" as const, table_id: tableId } : e,
      );
      saveEntries(next);

      // Best-effort: mark the table occupied in Supabase
      await supabase.from("v2_tables").update({ status: "occupied" }).eq("id", tableId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["waitlist"] });
      qc.invalidateQueries({ queryKey: ["v2_tables"] });
    },
  });
}

export function useCancelWaitlistEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const next = loadEntries().map((e) =>
        e.id === id ? { ...e, status: "cancelled" as const } : e,
      );
      saveEntries(next);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["waitlist"] });
    },
  });
}
