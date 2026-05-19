// FILE: apps/storefront/src/theme-engine/registry/index.ts
import type React from "react";
import type { LayoutSection } from "@/theme-engine/layouts/load-page-layout";

// ========================
// Templates (classic)
// ========================
import ClassicHome from "@/themes/classic/templates/home";
import ClassicCategory from "@/themes/classic/templates/category";
import ClassicProduct from "@/themes/classic/templates/product";

// ========================
// Templates (modern)
// ========================
import ModernHome from "@/themes/modern/templates/home";
import ModernCategory from "@/themes/modern/templates/category";
import ModernProduct from "@/themes/modern/templates/product";

// ========================
// Sections (classic)
// ========================
import ClassicHero from "@/themes/classic/sections/hero";
import ClassicCategoriesGrid from "@/themes/classic/sections/categories-grid";
import ClassicProductsGrid from "@/themes/classic/sections/products-grid";
import ClassicBanner from "@/themes/classic/sections/banner";
import ClassicFooter from "@/themes/classic/sections/footer";

// ========================
// Sections (modern)
// ========================
import ModernHero from "@/themes/modern/sections/hero";
import ModernCategoriesGrid from "@/themes/modern/sections/categories-grid";
import ModernProductsGrid from "@/themes/modern/sections/products-grid";
import ModernBanner from "@/themes/modern/sections/banner";
import ModernFooter from "@/themes/modern/sections/footer";

export type ThemeCode = "classic" | "modern";

export type StoreRow = {
  id: string;
  slug: string;
  name: string;
};

export type ThemeRuntime = {
  code: ThemeCode;
  settings: Record<string, any>;
};

export type TemplateProps = {
  store: StoreRow;
  theme: ThemeRuntime;
  sections: LayoutSection[];
  data?: any;
};

export type TemplateKey = "home" | "category" | "product";

export type TemplateRenderer = (
  p: TemplateProps,
) => React.ReactElement | Promise<React.ReactElement | null> | null;

export type SectionRenderer = (
  p: any,
) => React.ReactElement | Promise<React.ReactElement | null> | null;

type ThemeRegistryItem = {
  code: ThemeCode;
  name: string;
  default_settings: Record<string, any>;
  templates: Record<TemplateKey, TemplateRenderer>;
  sections: Record<string, SectionRenderer>;
};

// ========================
// REGISTRY
// ========================
const REGISTRY: Record<ThemeCode, ThemeRegistryItem> = {
  classic: {
    code: "classic",
    name: "Classic",
    default_settings: {},
    templates: {
      home: ClassicHome,
      category: ClassicCategory,
      product: ClassicProduct,
    },
    sections: {
      hero: ClassicHero,
      categories_grid: ClassicCategoriesGrid,
      products_grid: ClassicProductsGrid,
      banner: ClassicBanner,
      footer: ClassicFooter,
    },
  },

  modern: {
    code: "modern",
    name: "Modern",
    default_settings: {},
    templates: {
      home: ModernHome,
      category: ModernCategory,
      product: ModernProduct,
    },
    sections: {
      hero: ModernHero,
      categories_grid: ModernCategoriesGrid,
      products_grid: ModernProductsGrid,
      banner: ModernBanner,
      footer: ModernFooter,
    },
  },
};

export const themeRegistry = {
  has(code: ThemeCode) {
    return !!REGISTRY[code];
  },

  get(code: ThemeCode) {
    return REGISTRY[code];
  },

  defaultTheme() {
    return REGISTRY.classic;
  },
};