import { createClient } from "@supabase/supabase-js";

const projectUrl = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const publicKey = publishableKey || anonKey;

export const supabaseConfigured = Boolean(projectUrl && publicKey);
export const supabase = supabaseConfigured
  ? createClient(projectUrl, publicKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Copy .env.example to .env and add the project URL and publishable key.");
  }

  return supabase;
}
