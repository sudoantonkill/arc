import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function readLocalStorage(key: string): string | undefined {
  try {
    if (typeof window === "undefined") return undefined;
    const v = window.localStorage.getItem(key);
    return v || undefined;
  } catch {
    return undefined;
  }
}

export type SupabaseConfigSource = "env" | "localStorage" | "missing";

export type SupabaseConfig = {
  url?: string;
  anonKey?: string;
  urlSource: SupabaseConfigSource;
  anonKeySource: SupabaseConfigSource;
};

function readEnv(): { url?: string; anonKey?: string } {
  const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const envKey =
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);
  return { url: envUrl, anonKey: envKey };
}

function readLs(): { url?: string; anonKey?: string } {
  return {
    url: readLocalStorage("supabase_url"),
    anonKey: readLocalStorage("supabase_anon_key"),
  };
}

export function getSupabaseConfig(): SupabaseConfig {
  const env = readEnv();
  const ls = readLs();

  const url = env.url ?? ls.url;
  const anonKey = env.anonKey ?? ls.anonKey;

  return {
    url,
    anonKey,
    urlSource: env.url ? "env" : ls.url ? "localStorage" : "missing",
    anonKeySource: env.anonKey ? "env" : ls.anonKey ? "localStorage" : "missing",
  };
}

export function isSupabaseConfigured(): boolean {
  const cfg = getSupabaseConfig();
  return Boolean(cfg.url && cfg.anonKey);
}

let cachedClient: SupabaseClient | null = null;
let cachedUrl: string | null = null;
let cachedAnonKey: string | null = null;

// IMPORTANT: never throw here — throwing in a module causes a blank screen.
// Instead, keep the app running and gate auth-dependent flows.
export function getSupabaseClient(): SupabaseClient | null {
  const cfg = getSupabaseConfig();
  if (!cfg.url || !cfg.anonKey) return null;

  if (cachedClient && cachedUrl === cfg.url && cachedAnonKey === cfg.anonKey) {
    return cachedClient;
  }

  cachedUrl = cfg.url;
  cachedAnonKey = cfg.anonKey;
  cachedClient = createClient(cfg.url, cfg.anonKey);
  return cachedClient;
}

export function persistSupabaseConfig(next: { url: string; anonKey: string }) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("supabase_url", next.url);
  window.localStorage.setItem("supabase_anon_key", next.anonKey);
}

export function clearSupabaseConfig() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("supabase_url");
  window.localStorage.removeItem("supabase_anon_key");
  // Reset cached client so the next call re-reads config.
  cachedClient = null;
  cachedUrl = null;
  cachedAnonKey = null;
}

