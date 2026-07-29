export type MobileMarketingHubType =
  | "trend"
  | "seasonal"
  | "best_seller"
  | "new_arrival"
  | "clearance"
  | "flash_sale";

export const MOBILE_MARKETING_HUBS: Record<MobileMarketingHubType, { label: string; icon: string; appPath: string }> = {
  trend: { label: "الترندات", icon: "🔥", appPath: "/marketing/trends" },
  seasonal: { label: "المواسم والمناسبات", icon: "🌙", appPath: "/marketing/seasons" },
  best_seller: { label: "الأفضل مبيعًا", icon: "🏆", appPath: "/marketing/best-sellers" },
  new_arrival: { label: "وصل حديثًا", icon: "🆕", appPath: "/marketing/new-arrivals" },
  clearance: { label: "التصفية", icon: "🏷️", appPath: "/marketing/clearance" },
  flash_sale: { label: "العروض السريعة", icon: "⚡", appPath: "/marketing/flash-deals" },
};

export const MOBILE_MARKETING_ORDER: MobileMarketingHubType[] = [
  "trend",
  "seasonal",
  "best_seller",
  "clearance",
  "flash_sale",
  "new_arrival",
];

export function mobileMarketingTypeFromScreen(screen: string): MobileMarketingHubType | null {
  const normalized = String(screen || "").trim().toLowerCase();
  const aliases: Record<string, MobileMarketingHubType> = {
    trends: "trend",
    seasons: "seasonal",
    "best-sellers": "best_seller",
    "new-arrivals": "new_arrival",
    clearance: "clearance",
    "flash-deals": "flash_sale",
  };
  return aliases[normalized] ?? null;
}
