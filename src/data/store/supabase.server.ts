// FILE: apps/storefront/src/data/store/supabase.server.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
  // eslint-disable-next-line no-var
  var __sb_admin: SupabaseClient | undefined;
}

function isValidSupabaseClient(value: unknown): value is SupabaseClient {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as any).from === "function" &&
      typeof (value as any).rpc === "function",
  );
}

export function supabaseAdmin(): SupabaseClient {
  const cached = globalThis.__sb_admin;

  if (isValidSupabaseClient(cached)) {
    return cached;
  }

  // مهم جدًا:
  // لو كان فيه كاش قديم غلط بسبب HMR أو تعديل سابق، لا ترجعه.
  if (cached) {
    globalThis.__sb_admin = undefined;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing env: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 0,
      },
    },
  });

  if (!isValidSupabaseClient(client)) {
    throw new Error("SUPABASE_ADMIN_CLIENT_INVALID");
  }

  globalThis.__sb_admin = client;
  return client;
}