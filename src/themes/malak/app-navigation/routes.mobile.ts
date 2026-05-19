// FILE: apps/storefront/src/themes/malak/app-navigation/routes.mobile.ts

import HomeMobileScreen from "../screens-mobile/home/HomeMobileScreen";
import CategoriesMobileScreen from "../screens-mobile/categories/CategoriesMobileScreen";
import CategoryMobileScreen from "../screens-mobile/category/CategoryMobileScreen";
import ProductMobileScreen from "../screens-mobile/product/ProductMobileScreen";
import CartMobileScreen from "../screens-mobile/cart/CartMobileScreen";
import AccountMobileScreen from "../screens-mobile/account/AccountMobileScreen";
import OrdersMobileScreen from "../screens-mobile/account/OrdersMobileScreen";
import AddressesMobileScreen from "../screens-mobile/account/AddressesMobileScreen";
import FavoritesMobileScreen from "../screens-mobile/account/FavoritesMobileScreen";
import GiftBalanceMobileScreen from "../screens-mobile/account/GiftBalanceMobileScreen";
import ReferMobileScreen from "../screens-mobile/account/ReferMobileScreen";
import RewardsMobileScreen from "../screens-mobile/account/RewardsMobileScreen";
import TicketsMobileScreen from "../screens-mobile/account/TicketsMobileScreen";
import WalletMobileScreen from "../screens-mobile/account/WalletMobileScreen";
import OrderDetailsMobileScreen from "../screens-mobile/account/OrderDetailsMobileScreen";

export const MOBILE_ROUTES = {
  home: {
    key: "home",
    path: "/",
    component: HomeMobileScreen,
  },

  categories: {
    key: "categories",
    path: "/categories",
    component: CategoriesMobileScreen,
  },

  category: {
    key: "category",
    path: "/c/:slug",
    component: CategoryMobileScreen,
  },

  product: {
    key: "product",
    path: "/p/:slug",
    component: ProductMobileScreen,
  },

  cart: {
    key: "cart",
    path: "/cart",
    component: CartMobileScreen,
  },

  account: {
    key: "account",
    path: "/account",
    component: AccountMobileScreen,
  },

  orders: {
    key: "orders",
    path: "/account/orders",
    component: OrdersMobileScreen,
  },

  addresses: {
    key: "addresses",
    path: "/account/addresses",
    component: AddressesMobileScreen,
  },

  giftbalance: {
    key: "giftbalance",
    path: "/account/gift-balance",
    component: GiftBalanceMobileScreen,
  },

  favorites: {
    key: "favorites",
    path: "/account/favorites",
    component: FavoritesMobileScreen,
  },

  refer: {
    key: "refer",
    path: "/account/refer",
    component: ReferMobileScreen,
  },

  rewards: {
    key: "rewards",
    path: "/account/rewards",
    component: RewardsMobileScreen,
  },

  tickets: {
    key: "tickets",
    path: "/account/tickets",
    component: TicketsMobileScreen,
  },

  wallet: {
    key: "wallet",
    path: "/account/wallet",
    component: WalletMobileScreen,
  },

  order_details: {
    key: "order_details",
    path: "/account/orders/:orderNo",
    component: OrderDetailsMobileScreen,
  },
} as const;

export type MobileRouteKey = keyof typeof MOBILE_ROUTES;