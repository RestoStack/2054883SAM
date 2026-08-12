/**
 * Ship mode controls what is publicly exposed.
 *
 * - launch (default): ready-for-launch invite-only — launch landing, no demo, Server Pad off
 * - invite: same gates as launch (legacy alias)
 * - demo: sales/demo deploy — sample restaurant + known demo logins + coming-soon marketing
 * - public: self-serve signup (NOT ready — treated like invite until P0s clear)
 *
 * Override with VITE_SHIP_MODE=launch|demo|invite|public
 * Fine-grained:
 *   VITE_ALLOW_PUBLIC_SIGNUP=true|false
 *   VITE_ENABLE_DEMO_ACCESS=true|false
 *   VITE_INVITE_CODE=secret   (optional unlock for /signup)
 */
export type ShipMode = "launch" | "demo" | "invite" | "public";

function readEnv(name: string): string | undefined {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env?.[name]) {
      return String(import.meta.env[name]);
    }
  } catch {
    /* ignore */
  }
  if (typeof process !== "undefined" && process.env?.[name]) {
    return String(process.env[name]);
  }
  return undefined;
}

export function getShipMode(): ShipMode {
  const raw = (readEnv("VITE_SHIP_MODE") || readEnv("SHIP_MODE") || "launch").toLowerCase();
  if (raw === "launch" || raw === "demo" || raw === "invite" || raw === "public") return raw;
  return "launch";
}

/** True for customer-facing launch/invite deploys (not sales demo). */
export function isLaunchSurface(): boolean {
  const mode = getShipMode();
  return mode === "launch" || mode === "invite";
}

export function isPublicSignupEnabled(): boolean {
  const override = readEnv("VITE_ALLOW_PUBLIC_SIGNUP");
  if (override === "true") return true;
  if (override === "false") return false;
  return false;
}

export function isDemoAccessEnabled(): boolean {
  const override = readEnv("VITE_ENABLE_DEMO_ACCESS");
  if (override === "true") return true;
  if (override === "false") return false;
  return getShipMode() === "demo";
}

/** Global v1 Server Pad is unsafe for multi-tenant launch deploys. */
export function isServerPadEnabled(): boolean {
  const override = readEnv("VITE_ENABLE_SERVER_PAD");
  if (override === "true") return true;
  if (override === "false") return false;
  return getShipMode() === "demo";
}

/** Optional shared invite code that unlocks /signup. */
export function getInviteCode(): string | null {
  const code = readEnv("VITE_INVITE_CODE");
  return code && code.trim() ? code.trim() : null;
}

export function inviteCodeMatches(input: string): boolean {
  const expected = getInviteCode();
  if (!expected) return false;
  return input.trim() === expected;
}

export function shipModeLabel(): string {
  const mode = getShipMode();
  if (mode === "demo") return "Demo deploy";
  if (mode === "public") return "Public (not ready — gated as invite)";
  if (mode === "invite") return "Invite-only beta";
  return "Launch — invite only";
}
