// FILE: apps/storefront/src/themes/basit/smart-search/visibility.ts

function clean(pathname: string | null | undefined) {
  const raw = String(pathname ?? "/").trim() || "/";
  return raw.split("?")[0].replace(/\/+$/, "") || "/";
}

export function shouldShowSmartSearchOnDesktop(pathname: string | null | undefined) {
  const path = clean(pathname);
  if (path === "/") return false;
  return !(
    path === "/cart" ||
    path.startsWith("/checkout") ||
    path === "/login" ||
    path.startsWith("/account") ||
    path.startsWith("/thankyou") ||
    path.startsWith("/thank-you")
  );
}

export function shouldShowSmartSearchOnMobile(pathname: string | null | undefined) {
  const path = clean(pathname);
  return !(
    path === "/cart" ||
    path.startsWith("/checkout") ||
    path === "/login" ||
    path.startsWith("/account") ||
    path.startsWith("/thankyou") ||
    path.startsWith("/thank-you")
  );
}
