// FILE: apps/storefront/src/theme-engine/registry.ts
export type { ThemeCode } from "./types";
import type { ThemeCode } from "./types";

// Classic templates
import ClassicHome from "../themes/classic/templates/home";
import ClassicCategory from "../themes/classic/templates/category";
import ClassicProduct from "../themes/classic/templates/product";
export * from "./registry/index";
// Classic sections
import Hero from "../themes/classic/sections/hero";
import Banner from "../themes/classic/sections/banner";
import CategoriesGrid from "../themes/classic/sections/categories-grid";
import ProductsGrid from "../themes/classic/sections/products-grid";
import FooterSection from "../themes/classic/sections/footer";

type ThemeDefinition = {
  code: ThemeCode;
  default_settings: Record<string, any>;
  templates: Record<string, any>;
  sections: Record<string, any>;
};

const CLASSIC_THEME: ThemeDefinition = {
  code: "classic",
  default_settings: {},
  templates: {
    home: ClassicHome,
    category: ClassicCategory,
    product: ClassicProduct,
  },
  sections: {
    hero: Hero,
    banner: Banner,
    "categories-grid": CategoriesGrid,
    "products-grid": ProductsGrid,
    footer: FooterSection,
  },
};

const MALAK_THEME: ThemeDefinition = {
  code: "malak",
  default_settings: {},
  // ✅ مالك app-shell: ما يعتمد على templates/sections هنا
  templates: {},
  sections: {},
};

const THEMES: Partial<Record<ThemeCode, ThemeDefinition>> = {
  classic: CLASSIC_THEME,
  malak: MALAK_THEME,
};

export const themeRegistry = {
  defaultTheme(): ThemeDefinition {
    return CLASSIC_THEME;
  },
  has(code?: ThemeCode | string | null): boolean {
    if (!code) return false;
    return Boolean(THEMES[code as ThemeCode]);
  },
  get(code?: ThemeCode | string | null): ThemeDefinition {
    if (!code) return CLASSIC_THEME;
    return THEMES[code as ThemeCode] ?? CLASSIC_THEME;
  },
};
