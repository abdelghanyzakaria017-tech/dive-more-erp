// Dive More ERP — Supabase client (Phase 50)
//
// Created lazily and only when both env vars are set, so the app still
// runs in demo/API mode (and in non-browser tests) without Supabase:
//   VITE_SUPABASE_URL       — Project URL (Supabase Dashboard > Settings > API)
//   VITE_SUPABASE_ANON_KEY  — anon public key (same page; safe for browsers,
//                             Row Level Security is what protects the data)

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (): string =>
  ((import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '').trim();

const supabaseAnonKey = (): string =>
  ((import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '').trim();

export const isSupabaseConfigured = (): boolean =>
  supabaseUrl().length > 0 && supabaseAnonKey().length > 0;

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(supabaseUrl(), supabaseAnonKey());
  }
  return client;
}
