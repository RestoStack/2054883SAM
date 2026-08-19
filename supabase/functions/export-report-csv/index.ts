import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: auth } } },
    );

    const body = await req.json();
    const { organization_id, location_id, from, to, group_by } = body ?? {};
    if (!organization_id || !from || !to) {
      return new Response(JSON.stringify({ ok: false, error: "Missing fields" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase.rpc("reports_reservation_metrics", {
      _organization_id: organization_id,
      _location_id: location_id ?? null,
      _from: from,
      _to: to,
      _group_by: group_by ?? "day",
    });
    if (error || !data?.ok) {
      return new Response(JSON.stringify({ ok: false, error: error?.message ?? data?.error }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const rows = (data.rows ?? []) as Array<Record<string, unknown>>;
    const header = ["bucket", "reservations", "covers", "no_shows"];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push(
        [r.bucket, r.reservations, r.covers, r.no_shows]
          .map((v) => String(v ?? ""))
          .join(","),
      );
    }
    const csv = lines.join("\n");

    return new Response(csv, {
      headers: {
        ...cors,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="report-${from}_${to}.csv"`,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
