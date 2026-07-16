import { createServerFn } from "@tanstack/react-start";

const STAFF_EMAIL_DOMAIN = "jukebox.local";
const ADMIN_DEFAULT_PASSWORD = "admin1234";

export function staffEmailFor(staffId: string) {
  return `staff-${staffId}@${STAFF_EMAIL_DOMAIN}`;
}
export function staffPasswordFor(pin: string) {
  return `pin-${pin}`;
}

/**
 * One-shot bootstrap: creates Supabase auth users for every v2_users row that
 * doesn't have auth_user_id yet, and links them. Safe to call repeatedly.
 *
 * For admins: uses their real email + ADMIN_DEFAULT_PASSWORD ("admin1234").
 * For hostess/server: uses predictable email "staff-<id>@jukebox.local"
 * and "pin-<pin>" as the password.
 */
export const bootstrapStaffAuth = createServerFn({ method: "POST" }).handler(
  async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: staff, error: staffErr } = await supabaseAdmin
      .from("v2_users")
      .select("id, full_name, role, email, pin, auth_user_id")
      .is("auth_user_id", null);

    if (staffErr) throw new Error(staffErr.message);
    if (!staff || staff.length === 0) {
      return { created: 0, message: "All staff already linked." };
    }

    let created = 0;
    const results: Array<{ name: string; email: string; password: string }> = [];

    for (const s of staff) {
      let email: string;
      let password: string;

      if (s.role === "admin") {
        if (!s.email) continue;
        email = s.email;
        password = ADMIN_DEFAULT_PASSWORD;
      } else {
        if (!s.pin) continue;
        email = staffEmailFor(s.id);
        password = staffPasswordFor(s.pin);
      }

      // Try to find existing auth user with this email
      const { data: existingList } =
        await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = existingList?.users.find((u) => u.email === email);

      let authUserId: string;
      if (existing) {
        authUserId = existing.id;
      } else {
        const { data: newUser, error: createErr } =
          await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: s.full_name, role: s.role },
          });
        if (createErr || !newUser?.user) {
          console.error("createUser failed for", email, createErr);
          continue;
        }
        authUserId = newUser.user.id;
        created++;
      }

      await supabaseAdmin
        .from("v2_users")
        .update({ auth_user_id: authUserId })
        .eq("id", s.id);

      results.push({ name: s.full_name, email, password });
    }

    return {
      created,
      message: `Linked ${results.length} staff. ${created} new auth users created.`,
      credentials: results,
    };
  },
);
