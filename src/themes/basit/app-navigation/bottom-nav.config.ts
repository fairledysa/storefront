// FILE: apps/storefront/src/themes/basit/app-navigation/bottom-nav.config.ts
import type { ComponentProps } from "react";
import Icon from "@/components/icon/Icon";

export type IconName = ComponentProps<typeof Icon>["icon"];

export type BottomNavScreenKey = "home" | "categories" | "cart" | "account";

export type BottomNavItem =
  | {
      type: "screen";
      key: BottomNavScreenKey;
      label: string;
      icon: IconName;
      href: string;
      badge?: number | string;
    }
  | {
      type: "link";
      href: string;
      label: string;
      icon: IconName;
      badge?: number | string;
    };

export const BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  {
    type: "screen",
    key: "home",
    label: "الرئيسية",
    icon: "Home03",
    href: "/",
  },
  {
    type: "screen",
    key: "categories",
    label: "الأقسام",
    icon: "DashboardCircle",
    href: "/categories",
  },
  {
    type: "screen",
    key: "cart",
    label: "السلة",
    icon: "ShoppingBag02",
    href: "/cart",
  },
  {
    type: "screen",
    key: "account",
    href: "/account",
    label: "حسابي",
    icon: "UserSquare",
  },
  {
    type: "link",
    href: "/search",
    label: "البحث",
    icon: "SearchSquare",
  },
];