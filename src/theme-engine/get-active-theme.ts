// FILE: apps/storefront/src/theme-engine/get-active-theme.ts
import { cache } from "react";
import { unstable_noStore as noStore } from "next/cache";
import type { ThemeCode } from "./types";
import { supabaseAdmin } from "@/data/store/supabase.server";

export const getActiveThemeCode = cache(
  async (storeId: string): Promise<ThemeCode> => {
    noStore();

    const sb = supabaseAdmin();

    // 1) جيب theme_id حق published
    const { data: st, error: stErr } = await sb
      .from("store_themes")
      .select("theme_id, status, updated_at")
      .eq("store_id", storeId)
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (stErr) {
      console.error("[getActiveThemeCode] store_themes error:", stErr);
      return "classic" as ThemeCode;
    }

    const themeId = (st as any)?.theme_id as string | undefined;
    if (!themeId) return "classic" as ThemeCode;

    // 2) حوّل theme_id إلى code من جدول themes
    const { data: t, error: tErr } = await sb
      .from("themes")
      .select("code")
      .eq("id", themeId)
      .maybeSingle();

    if (tErr) {
      console.error("[getActiveThemeCode] themes error:", tErr);
      return "classic" as ThemeCode;
    }

    const code = (t as any)?.code as ThemeCode | undefined;
    return code ?? ("classic" as ThemeCode);
  },
);
