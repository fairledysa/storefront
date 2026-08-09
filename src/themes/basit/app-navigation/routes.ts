// FILE: apps/storefront/src/themes/basit/app-navigation/routes.ts

import type React from "react";

import HomeScreen from "../screens/home/HomeScreen";
import CategoriesScreen from "../screens/categories/CategoriesScreen";
import CategoryScreen from "../screens/category/CategoryScreen";
import ProductScreen from "../screens/product/ProductScreen";
import CartScreen from "../screens/cart/CartScreen";
import ThankYouScreen from "../screens/thankyou/ThankYouScreen";
import SearchScreen from "../screens/search/SearchScreen";

import AccountScreen from "../screens/account/AccountScreen";
import WalletScreen from "../screens/account/WalletScreen";
import OrdersScreen from "../screens/account/OrdersScreen";
import OrderDetailsScreen from "../screens/account/OrderDetailsScreen";
import AddressesScreen from "../screens/account/AddressesScreen";
import RewardsScreen from "../screens/account/RewardsScreen";
import GiftBalanceScreen from "../screens/account/GiftBalanceScreen";
import ReferScreen from "../screens/account/ReferScreen";
import TicketsScreen from "../screens/account/TicketsScreen";
import FavoritesScreen from "../screens/account/FavoritesScreen";

export type ScreenName =
  | "home"
  | "categories"
  | "category"
  | "product"
  | "cart"
  | "checkout"
  | "thankyou"
  | "search"
  | "account"
  | "wallet"
  | "orders"
  | "order_details"
  | "addresses"
  | "rewards"
  | "gift_balance"
  | "refer"
  | "tickets"
  | "favorites";

export type RoutesMap = Partial<
  Record<
    ScreenName,
    {
      key: ScreenName;
      path?: string;
      component: React.ComponentType<any>;
    }
  >
>;

export const ROUTES: RoutesMap = {
  home: { key: "home", path: "/", component: HomeScreen },
  categories: {
    key: "categories",
    path: "/categories",
    component: CategoriesScreen,
  },
  category: { key: "category", component: CategoryScreen },
  product: { key: "product", component: ProductScreen },
  cart: { key: "cart", path: "/cart", component: CartScreen },

  checkout: {
    key: "checkout",
    path: "/checkout",
    component: (() => null) as any,
  },

  thankyou: {
    key: "thankyou",
    component: ThankYouScreen,
  },

  search: {
    key: "search",
    path: "/search",
    component: SearchScreen,
  },

  account: {
    key: "account",
    path: "/account",
    component: AccountScreen,
  },
  wallet: {
    key: "wallet",
    path: "/account/wallet",
    component: WalletScreen,
  },
  orders: {
    key: "orders",
    path: "/account/orders",
    component: OrdersScreen,
  },
  order_details: {
    key: "order_details",
    component: OrderDetailsScreen,
  },
  addresses: {
    key: "addresses",
    path: "/account/addresses",
    component: AddressesScreen,
  },
  rewards: {
    key: "rewards",
    path: "/account/rewards",
    component: RewardsScreen,
  },
  gift_balance: {
    key: "gift_balance",
    path: "/account/gift-balance",
    component: GiftBalanceScreen,
  },
  refer: {
    key: "refer",
    path: "/account/refer",
    component: ReferScreen,
  },
  tickets: {
    key: "tickets",
    path: "/account/tickets",
    component: TicketsScreen,
  },
  favorites: {
    key: "favorites",
    path: "/account/favorites",
    component: FavoritesScreen,
  },
} as const;