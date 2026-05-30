// FILE: apps/storefront/src/data/store/maintenance.ts

import "server-only";

import { cache } from "react";

import { getStoreDb } from "@/data/db/store-db.server";

export type StoreMaintenanceSettings = {
  enabled: boolean;
  title: string;
  message: string;
  show_contact_methods: boolean;
};

const DEFAULT_MAINTENANCE_SETTINGS: StoreMaintenanceSettings = {
  enabled: false,
  title: "المتجر مغلق حاليًا",
  message:
    "عذرًا عزيزي العميل، المتجر حاليًا قيد الصيانة وسنعاود العمل خلال وقت قريب.",
  show_contact_methods: true,
};

function s(value: unknown) {
  return String(value ?? "").trim();
}

function safeObject(value: any): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {}
  }

  return {};
}

function text(value: unknown, fallback: string, max: number) {
  const out = s(value);
  return (out || fallback).slice(0, max);
}

function normalizeMaintenanceSettings(value: any): StoreMaintenanceSettings {
  const source = safeObject(value);

  return {
    enabled: Boolean(source.enabled),
    title: text(source.title, DEFAULT_MAINTENANCE_SETTINGS.title, 120),
    message: text(source.message, DEFAULT_MAINTENANCE_SETTINGS.message, 700),
    show_contact_methods:
      typeof source.show_contact_methods === "boolean"
        ? source.show_contact_methods
        : DEFAULT_MAINTENANCE_SETTINGS.show_contact_methods,
  };
}

export const getStoreMaintenanceSettings = cache(
  async (storeId: string): Promise<StoreMaintenanceSettings> => {
    const id = s(storeId);

    if (!id) return DEFAULT_MAINTENANCE_SETTINGS;

    const sb = (await getStoreDb(id)) as any;

    const { data, error } = await sb
      .from("store_settings")
      .select("value")
      .eq("store_id", id)
      .eq("slug", "maintenance")
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("STORE_MAINTENANCE_LOAD_FAILED", {
        storeId: id,
        error,
      });

      return DEFAULT_MAINTENANCE_SETTINGS;
    }

    return normalizeMaintenanceSettings(data?.value);
  },
);