// apps/storefront/src/theme-engine/fonts.ts

export type FontKey = "tajawal" | "cairo" | "almarai" | "rubik" | "lusail";

export type ThemeFont = {
  key: FontKey;
  label: string;
  cssVar: string; // CSS variable used on :root
  className: string; // Tailwind helper class
  fontFamily: string; // actual font-family
};

/**
 * ✅ جميع الخطوط المدعومة في النظام
 * أي خط تضيفه هنا:
 * 1) يظهر في لوحة التحكم
 * 2) ينحفظ في DB
 * 3) يطبق على الثيم
 */
export const THEME_FONTS: Record<FontKey, ThemeFont> = {
  tajawal: {
    key: "tajawal",
    label: "Tajawal",
    cssVar: "--font-store",
    className: "font-tajawal",
    fontFamily:
      "Tajawal, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
  },

  cairo: {
    key: "cairo",
    label: "Cairo",
    cssVar: "--font-store",
    className: "font-cairo",
    fontFamily:
      "Cairo, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
  },

  almarai: {
    key: "almarai",
    label: "Almarai",
    cssVar: "--font-store",
    className: "font-almarai",
    fontFamily:
      "Almarai, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
  },

  rubik: {
    key: "rubik",
    label: "Rubik",
    cssVar: "--font-store",
    className: "font-rubik",
    fontFamily:
      "Rubik, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
  },

  lusail: {
    key: "lusail",
    label: "Lusail",
    cssVar: "--font-store",
    className: "font-lusail",
    fontFamily:
      "Lusail, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
  },
};

/**
 * ✅ الخط الافتراضي لو ما كان فيه قيمة محفوظة
 */
export const DEFAULT_FONT: FontKey = "tajawal";

/**
 * ✅ Helper: رجّع font object بأمان
 */
export function getThemeFont(key?: string): ThemeFont {
  if (!key) return THEME_FONTS[DEFAULT_FONT];
  return THEME_FONTS[key as FontKey] ?? THEME_FONTS[DEFAULT_FONT];
}
