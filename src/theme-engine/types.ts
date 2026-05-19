//apps/storefront/src/theme-engine/types.ts

export type ThemeCode = "classic" | "malak";
export type ThemeKind = "legacy" | "app-shell";

export const THEME_KIND: Record<ThemeCode, ThemeKind> = {
  classic: "legacy",
  malak: "app-shell",
};
