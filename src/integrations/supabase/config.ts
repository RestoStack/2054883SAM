/**
 * Public Supabase project config (anon / publishable key only).
 * Production must set VITE_SUPABASE_* / SUPABASE_* to **your** project.
 * Defaults below are a trial fallback for local/preview only — replace when cutting over
 * (see INDEPENDENCE.md).
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
