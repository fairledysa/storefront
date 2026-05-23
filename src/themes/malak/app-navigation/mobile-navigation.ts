//apps/storefront/src/themes/malak/app-navigation/mobile-navigation.ts
"use client";

export const MK_MOBILE_NAV_START = "mk:mobile-navigation:start";
export const MK_MOBILE_NAV_FINISH = "mk:mobile-navigation:finish";
export const MK_MOBILE_NAV_CANCEL = "mk:mobile-navigation:cancel";

export type MobileNavigationSource =
  | "link"
  | "bottom-nav"
  | "programmatic"
  | "popstate";

export type MobileNavigationDetail = {
  href?: string;
  source?: MobileNavigationSource;
};

function dispatchMobileNavigationEvent(
  name: string,
  detail?: MobileNavigationDetail,
) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(name, {
      detail: detail ?? {},
    }),
  );
}

export function startMobileNavigation(detail?: MobileNavigationDetail) {
  dispatchMobileNavigationEvent(MK_MOBILE_NAV_START, detail);
}

export function finishMobileNavigation(detail?: MobileNavigationDetail) {
  dispatchMobileNavigationEvent(MK_MOBILE_NAV_FINISH, detail);
}

export function cancelMobileNavigation(detail?: MobileNavigationDetail) {
  dispatchMobileNavigationEvent(MK_MOBILE_NAV_CANCEL, detail);
}