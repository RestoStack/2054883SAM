/**
 * Public Supabase project config for RestoStack (anon / publishable key only).
 * Prefer env vars in production; these defaults match the live Lovable project
 * so Vercel previews work when project env vars are not configured yet.
 */
export const SUPABASE_DEFAULTS = {
  url: "https://taenbelgzntolqzzjsee.supabase.co",
  publishableKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhZW5iZWxnem50b2xxenpqc2VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NDQwNjcsImV4cCI6MjA5NTQyMDA2N30.IAi3n6fNFmetrnmIv_W88tBg1FUHMRe7k6pzCJlRQ_0",
  projectId: "taenbelgzntolqzzjsee",
} as const;

export function getSupabaseUrl(): string {
  return (
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    SUPABASE_DEFAULTS.url
  );
}

export function getSupabasePublishableKey(): string {
  return (
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY) ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    SUPABASE_DEFAULTS.publishableKey
  );
}
