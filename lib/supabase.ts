import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { supabaseCredentials } from "./env";

// Server-only: the secret key bypasses row-level security. Never import this
// from a "use client" file or anything under app/**/page.tsx's client tree.
// No tables/queries exist yet — this is the single egress point future
// storage code (triage queue, forecast cache) will call through.
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    const { url, secretKey } = supabaseCredentials();
    client = createClient(url, secretKey);
  }
  return client;
}
