/**
 * Ship mode controls what is publicly exposed.
 *
 * - invite (default): ready-to-ship beta — no open signup, no demo credential UI
 * - demo: sales/demo deploy — sample restaurant + known demo logins
 * - public: self-serve signup (NOT ready — treated like invite until P0s clear)
 *
 * Override with VITE_SHIP_MODE=demo|invite|public
 * Fine-grained:
 *   VITE_ALLOW_PUBLIC_SIGNUP=true|false
 *   VITE_ENABLE_DEMO_ACCESS=true|false
 *   VITE_INVITE_CODE=secret   (optional unlock for /signup when invite mode)
 */
export type ShipMode = "demo" | "invite" | "public";

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
  const raw = (readEnv("VITE_SHIP_MODE") || readEnv("SHIP_MODE") || "invite").toLowerCase();
  if (raw === "demo" || raw === "invite" || raw === "public") return raw;
  return "invite";
}

export function isPublicSignupEnabled(): boolean {
  const override = readEnv("VITE_ALLOW_PUBLIC_SIGNUP");
  if (override === "true") return true;
  if (override === "false") return false;
  // "public" mode is reserved for future self-serve; still blocked until ready.
  return false;
}

export function isDemoAccessEnabled(): boolean {
  const override = readEnv("VITE_ENABLE_DEMO_ACCESS");
  if (override === "true") return true;
  if (override === "false") return false;
  return getShipMode() === "demo";
}

/** Optional shared invite code that unlocks /signup in invite mode. */
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
  return "Invite-only beta";
}
