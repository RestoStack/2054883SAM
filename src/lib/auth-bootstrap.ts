import { supabase } from "@/integrations/supabase/client";

/** Load the current Supabase Auth user for route context (null if signed out). */
export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}
