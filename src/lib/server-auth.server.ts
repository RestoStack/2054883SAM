// Server-only helpers for the staff PIN auth system.
// Never import this file from client code.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  getCookie,
  setCookie,
  deleteCookie,
} from "@tanstack/react-start/server";

const SESSION_COOKIE = "server_session";
const SESSION_HOURS = 12;

const enc = new TextEncoder();
const HEX = "0123456789abcdef";

function toHex(buf: ArrayBuffer): string {
  const view = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < view.length; i++) {
    out += HEX[view[i] >> 4] + HEX[view[i] & 0x0f];
  }
  return out;
}

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return toHex(arr.buffer);
}

// Constant-time string compare
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hashPin(pin: string, salt?: string) {
  const useSalt = salt ?? randomHex(16);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: enc.encode(useSalt),
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  return { hash: toHex(bits), salt: useSalt };
}

export async function verifyPin(pin: string, hash: string, salt: string) {
  const { hash: computed } = await hashPin(pin, salt);
  return timingSafeEqual(computed, hash);
}

export function newSessionToken() {
  return randomHex(32);
}

export function setSessionCookie(token: string) {
  setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60,
  });
}

export function clearSessionCookie() {
  deleteCookie(SESSION_COOKIE, { path: "/" });
}

export function readSessionCookie(): string | undefined {
  return getCookie(SESSION_COOKIE);
}

export type AuthedServer = {
  id: string;
  name: string;
  role: "server" | "admin";
  color: string;
};

/**
 * Verifies the session cookie and returns the current server.
 * Throws if no valid session.
 */
export async function requireServerSession(): Promise<AuthedServer> {
  const token = readSessionCookie();
  if (!token) throw new Error("Not signed in");

  const { data, error } = await supabaseAdmin
    .from("server_sessions")
    .select("server_id, expires_at, servers!inner(id, name, role, color, active)")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) throw new Error("Not signed in");
  if (new Date(data.expires_at) < new Date()) {
    await supabaseAdmin.from("server_sessions").delete().eq("token", token);
    throw new Error("Session expired");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s: any = data.servers;
  if (!s?.active) throw new Error("Account disabled");
  return { id: s.id, name: s.name, role: s.role, color: s.color };
}

export async function requireAdminSession(): Promise<AuthedServer> {
  const s = await requireServerSession();
  if (s.role !== "admin") throw new Error("Admin only");
  return s;
}

/**
 * One-time seed: if no servers exist, create demo accounts.
 * Default PINs: server staff = 1234, manager = 9999.
 */
export async function ensureSeedServers() {
  const { count, error } = await supabaseAdmin
    .from("servers")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  if ((count ?? 0) > 0) return;

  const seed = [
    { name: "Maya",    color: "#ef4444", role: "server" as const, pin: "1234" },
    { name: "Liam",    color: "#3b82f6", role: "server" as const, pin: "1234" },
    { name: "Aisha",   color: "#10b981", role: "server" as const, pin: "1234" },
    { name: "Sophia",  color: "#f59e0b", role: "server" as const, pin: "1234" },
    { name: "Manager", color: "#8b5cf6", role: "admin"  as const, pin: "9999" },
  ];

  const rows = await Promise.all(
    seed.map(async (s) => {
      const { hash, salt } = await hashPin(s.pin);
      return {
        name: s.name,
        color: s.color,
        role: s.role,
        pin_hash: hash,
        pin_salt: salt,
      };
    })
  );

  const { error: insertErr } = await supabaseAdmin.from("servers").insert(rows);
  if (insertErr) throw insertErr;
}
