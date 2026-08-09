import type { PopupContext, PopupPageType } from "./types";

function s(value: unknown) { return String(value ?? "").trim(); }
function first(...values: unknown[]) { for (const value of values) { const text = s(value); if (text) return text; } return ""; }

export function resolvePopupContext(data: any, pathname: string): PopupContext {
  const route = s(data?.route).toLowerCase();
  let pageType: PopupPageType = "other";
  if (route === "home" || pathname === "/") pageType = "home";
  else if (route === "product") pageType = "product";
  else if (route === "category") pageType = "category";
  else if (route === "page") pageType = "page";
  else if (route === "cart") pageType = "cart";
  else if (route === "search") pageType = "search";
  else if (route === "thankyou") pageType = "thankyou";
  else if (route.startsWith("account")) pageType = "account";

  const referenceId = first(
    pageType === "product" ? data?.product?.id : "",
    pageType === "product" ? data?.product_id : "",
    pageType === "category" ? data?.category?.id : "",
    pageType === "category" ? data?.category_id : "",
    pageType === "page" ? data?.id : "",
    pageType === "page" ? data?.page?.id : "",
  ) || null;

  return { pageType, referenceId, pathname: pathname || "/" };
}
