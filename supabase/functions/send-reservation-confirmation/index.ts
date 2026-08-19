import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const body = await req.json();
    const {
      email,
      guest_name,
      party_size,
      date,
      time,
      slug,
      reservation_id,
    } = body ?? {};

    if (!email || !guest_name || !date || !time) {
      return new Response(JSON.stringify({ ok: false, error: "Missing fields" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("RESEND_FROM") ?? "RestoStack <bookings@restostacks.com>";
    const appUrl = Deno.env.get("PUBLIC_APP_URL") ?? "https://app.restostacks.com";

    if (!apiKey) {
      // Soft-ok in staging without secrets — never SMS
      console.warn("RESEND_API_KEY not set; skipping confirmation email");
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const subject = `Reservation confirmed — ${date} at ${time}`;
    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto">
        <h1 style="font-size:20px">You're booked</h1>
        <p>Hi ${escapeHtml(guest_name)},</p>
        <p>Your table for <strong>${Number(party_size) || 2}</strong> on
          <strong>${escapeHtml(String(date))}</strong> at
          <strong>${escapeHtml(String(time))}</strong> is confirmed.</p>
        <p style="color:#64748b;font-size:13px">Confirmation #${escapeHtml(String(reservation_id ?? ""))}</p>
        <p><a href="${appUrl}/book/${encodeURIComponent(String(slug ?? ""))}">View booking page</a></p>
        <p style="color:#94a3b8;font-size:12px">No SMS will be sent. Manage this reservation with the restaurant directly if you need to change it.</p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Resend error", text);
      return new Response(JSON.stringify({ ok: false, error: "Email provider error" }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
