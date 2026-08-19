import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TableRow = {
  id: string;
  number: string;
  capacity: number;
  status: string;
  section: string | null;
  table_number: string;
};

export function useTables() {
  return useQuery({
    queryKey: ["v2_tables"],
    queryFn: async (): Promise<TableRow[]> => {
      const { data, error } = await supabase
        .from("v2_tables")
        .select("id, table_number, capacity, status, section")
        .order("table_number");
      if (error) throw error;
      return (data ?? []).map((t) => ({
        id: t.id,
        number: t.table_number,
        table_number: t.table_number,
        capacity: t.capacity,
        status: t.status,
        section: t.section,
      }));
    },
  });
}
