// FILE: apps/storefront/src/data/store/supabase.server.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
  // eslint-disable-next-line no-var
  var __sb_admin: SupabaseClient | undefined;
}

export function supabaseAdmin() {
  // ✅ يمنع تكرار إنشاء العميل مع HMR في التطوير
  if (globalThis.__sb_admin) return globalThis.__sb_admin;

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
    // ما نبي realtime هنا نهائي (ثقيل + غير مطلوب للسيرفر)
    realtime: { params: { eventsPerSecond: 0 } },
  });

  globalThis.__sb_admin = client;
  return client;
}
