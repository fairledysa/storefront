// FILE: apps/storefront/src/theme-engine/load-theme.tsx
import type { ThemeCode } from "./types";
import { THEME_KIND } from "./types";
import MalakTheme from "../themes/malak";
import BasitTheme from "../themes/basit";

export function loadTheme(themeCode: ThemeCode) {
  const kind = THEME_KIND[themeCode];

  if (kind === "app-shell") {
    if (themeCode === "malak") {
      return { kind, Component: MalakTheme };
    }

    if (themeCode === "basit") {
      return { kind, Component: BasitTheme };
    }
  }

  return { kind, Component: null };
}
