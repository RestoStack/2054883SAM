import { useEffect, useState } from "react";
import { Copy, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  settingsInviteTeam,
  settingsListTeam,
  settingsRemoveMember,
  settingsUpdateMemberRole,
} from "@/lib/settings-api";

type Member = {
  id: string;
  user_id: string;
  role: "owner" | "manager" | "host";
  is_active: boolean;
  email: string | null;
  full_name: string | null;
};

type Invite = {
  id: string;
  email: string | null;
  role: string;
  expires_at: string;
  accepted_at: string | null;
};

export function SettingsTeam() {
  const { org } = useAuth();
  const orgId = org.activeOrganizationId;
  const isOwner = org.role === "owner";
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"host" | "manager">("host");
  const [busy, setBusy] = useState(false);
  const [lastInvitePath, setLastInvitePath] = useState<string | null>(null);

  const refresh = async () => {
    if (!orgId) return;
    const res = await settingsListTeam(orgId);
    if (res.ok) {
      setMembers((res.members as Member[]) ?? []);
      setInvites((res.invites as Invite[]) ?? []);
    }
  };

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    refresh().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="size-4 animate-spin" /> Loading team…
      </div>
    );
  }

  if (!orgId) return <p className="text-sm text-muted-foreground">No organization selected.</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">Team</h2>
        <p className="text-sm text-muted-foreground">
          Invite by email (Google / email login). Team members skip payment.
        </p>
      </div>

      <div className="rounded-xl border border-border p-4 space-y-3">
        <h3 className="text-sm font-semibold">Invite teammate</h3>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_auto] gap-2">
          <input
            type="email"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="host@restaurant.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value as "host" | "manager")}
          >
            <option value="host">Host</option>
            <option value="manager">Manager</option>
          </select>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const res = await settingsInviteTeam({
                organization_id: orgId,
                email,
                role,
              });
              setBusy(false);
              if (!res.ok) {
                toast.error(res.error);
                return;
              }
              toast.success(`Invite created for ${email}`);
              setLastInvitePath(typeof res.invite_path === "string" ? res.invite_path : null);
              setEmail("");
              await refresh();
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            <Plus className="size-4" /> Invite
          </button>
        </div>
        {lastInvitePath && (
          <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-lg px-3 py-2">
            <code className="flex-1 truncate">
              {typeof window !== "undefined" ? window.location.origin : ""}
              {lastInvitePath}
            </code>
            <button
              type="button"
              className="inline-flex items-center gap-1 font-semibold"
              onClick={async () => {
                const full = `${window.location.origin}${lastInvitePath}`;
                await navigator.clipboard.writeText(full);
                toast.success("Invite link copied");
              }}
            >
              <Copy className="size-3.5" /> Copy
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Members</h3>
        {members.map((m) => (
          <div
            key={m.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-4 py-3"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">
                {m.full_name || m.email || m.user_id.slice(0, 8)}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {m.email}
                {!m.is_active ? " · inactive" : ""}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {m.role === "owner" ? (
                <span className="text-xs font-semibold capitalize px-2 py-1 rounded-md bg-muted">
                  owner
                </span>
              ) : (
                <select
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                  value={m.role}
                  disabled={!isOwner || !m.is_active}
                  onChange={async (e) => {
                    const res = await settingsUpdateMemberRole({
                      organization_id: orgId,
                      membership_id: m.id,
                      role: e.target.value as "manager" | "host",
                    });
                    if (!res.ok) toast.error(res.error);
                    else {
                      toast.success("Role updated");
                      await refresh();
                    }
                  }}
                >
                  <option value="host">host</option>
                  <option value="manager">manager</option>
                </select>
              )}
              {isOwner && m.role !== "owner" && m.is_active && (
                <button
                  type="button"
                  className="text-xs text-destructive font-semibold"
                  onClick={async () => {
                    const res = await settingsRemoveMember({
                      organization_id: orgId,
                      membership_id: m.id,
                    });
                    if (!res.ok) toast.error(res.error);
                    else {
                      toast.success("Member removed");
                      await refresh();
                    }
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
        {members.length === 0 && (
          <p className="text-sm text-muted-foreground">No members yet.</p>
        )}
      </div>

      {invites.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Pending invites</h3>
          {invites.map((i) => (
            <div
              key={i.id}
              className="rounded-lg border border-dashed border-border px-3 py-2 text-sm flex justify-between"
            >
              <span>
                {i.email} · {i.role}
              </span>
              <span className="text-xs text-muted-foreground">
                expires {new Date(i.expires_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
