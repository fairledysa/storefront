"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type Props = {
  data?: any;
  enabled: boolean;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function routeFromPath(pathname: string) {
  const path = pathname.toLowerCase();

  if (!path || path === "/") return "home";
  if (path === "/categories") return "categories";
  if (path === "/search") return "search";
  if (path === "/cart") return "cart";
  if (path === "/thankyou" || path === "/thank-you") return "thankyou";
  if (path === "/account") return "account";
  if (path === "/account/orders") return "orders";
  if (path.startsWith("/account/orders/")) return "order_details";
  if (path === "/account/addresses") return "addresses";
  if (path === "/account/favorites") return "favorites";
  if (path === "/account/rewards") return "rewards";
  if (path === "/account/wallet") return "wallet";
  if (path === "/account/refer") return "refer";
  if (path === "/account/tickets") return "tickets";
  if (path === "/trends") return "trends";
  if (path.includes("/product/") || path.includes("/products/") || path.includes("/p/")) return "product";
  if (path.includes("/category/") || path.includes("/categories/") || path.includes("/c/")) return "category";

  return "page";
}

function currentRoute(data: any, pathname: string) {
  const route = text(data?.route);
  if (route) return route;
  if (data?.product) return "product";
  if (data?.category) return "category";
  if (data?.page) return "page";
  return routeFromPath(pathname);
}

function pageLabel(data: any, pathname: string) {
  const direct = text(
    data?.page?.title ||
      data?.page?.name ||
      data?.title ||
      data?.seo?.title,
  );

  if (direct) return direct;

  const segment = pathname.split("/").filter(Boolean).at(-1) || "الصفحة";

  try {
    return decodeURIComponent(segment).replace(/[-_]+/g, " ");
  } catch {
    return segment.replace(/[-_]+/g, " ");
  }
}

export default function StoreBreadcrumbs({ data, enabled }: Props) {
  const pathname = usePathname() || "/";

  if (!enabled) return null;

  const route = currentRoute(data, pathname);

  // صفحة المنتج تملك مسارًا أدق يتضمن تصنيفات المنتج.
  if (route === "home" || route === "product") return null;

  const items: BreadcrumbItem[] = [{ label: "الرئيسية", href: "/" }];

  switch (route) {
    case "categories":
      items.push({ label: "التصنيفات" });
      break;

    case "category": {
      const categoryName = text(
        data?.category?.name || data?.category?.title || data?.title,
      );

      items.push({ label: "التصنيفات", href: "/categories" });
      items.push({ label: categoryName || "التصنيف" });
      break;
    }

    case "search": {
      const query = text(
        data?.query ||
          data?.search_query ||
          data?.searchQuery ||
          data?.search?.query,
      );
      items.push({ label: query ? `نتائج البحث عن: ${query}` : "نتائج البحث" });
      break;
    }

    case "cart":
      items.push({ label: "السلة" });
      break;

    case "thankyou":
      items.push({ label: "تأكيد الطلب" });
      break;

    case "account":
      items.push({ label: "حسابي" });
      break;

    case "orders":
      items.push({ label: "حسابي", href: "/account" });
      items.push({ label: "الطلبات" });
      break;

    case "order_details":
      items.push({ label: "حسابي", href: "/account" });
      items.push({ label: "الطلبات", href: "/account/orders" });
      items.push({ label: text(data?.orderNo || data?.order_no) || "تفاصيل الطلب" });
      break;

    case "addresses":
      items.push({ label: "حسابي", href: "/account" });
      items.push({ label: "العناوين" });
      break;

    case "favorites":
      items.push({ label: "حسابي", href: "/account" });
      items.push({ label: "المفضلة" });
      break;

    case "rewards":
      items.push({ label: "حسابي", href: "/account" });
      items.push({ label: "المكافآت" });
      break;

    case "wallet":
    case "giftbalance":
    case "gift_balance":
      items.push({ label: "حسابي", href: "/account" });
      items.push({ label: "المحفظة والرصيد" });
      break;

    case "refer":
      items.push({ label: "حسابي", href: "/account" });
      items.push({ label: "دعوة الأصدقاء" });
      break;

    case "tickets":
      items.push({ label: "حسابي", href: "/account" });
      items.push({ label: "التذاكر" });
      break;

    case "trends":
      items.push({ label: "الترندات" });
      break;

    default:
      items.push({ label: pageLabel(data, pathname) });
      break;
  }

  return (
    <nav
      className="bs-store-breadcrumbs"
      dir="rtl"
      aria-label="مسار التنقل"
      style={{
        boxSizing: "border-box",
        display: "block",
        width: "100%",
        margin: "14px 0 22px",
        overflow: "hidden",
        textAlign: "right",
      }}
    >
      <ol
        className="bs-store-breadcrumbs__list"
        style={{
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          flexDirection: "row",
          flexWrap: "nowrap",
          width: "100%",
          margin: 0,
          padding: 0,
          overflowX: "auto",
          overflowY: "hidden",
          listStyle: "none",
          whiteSpace: "nowrap",
          direction: "rtl",
          textAlign: "right",
          scrollbarWidth: "none",
        }}
      >
        {items.map((item, index) => {
          const last = index === items.length - 1;

          return (
            <li
              className={last ? "is-current" : undefined}
              key={`${item.label}-${index}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                flex: "0 0 auto",
                minWidth: 0,
                margin: 0,
                padding: 0,
                lineHeight: 1.5,
              }}
            >
              {item.href && !last ? (
                <Link
                  href={item.href}
                  style={{
                    color: "var(--mk-text-muted, #6b6b6b)",
                    fontSize: 13,
                    fontWeight: 500,
                    textDecoration: "none",
                  }}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  style={{
                    display: "inline-block",
                    maxWidth: last ? "min(42vw, 440px)" : undefined,
                    overflow: last ? "hidden" : undefined,
                    color: last
                      ? "var(--mk-text-main, #111111)"
                      : "var(--mk-text-muted, #6b6b6b)",
                    fontSize: 13,
                    fontWeight: last ? 700 : 500,
                    textOverflow: last ? "ellipsis" : undefined,
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </span>
              )}

              {!last ? (
                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-block",
                    flex: "0 0 auto",
                    marginInline: 9,
                    color: "var(--mk-text-muted, #8a8a8a)",
                    fontSize: 13,
                    fontWeight: 400,
                    lineHeight: 1,
                  }}
                >
                  /
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );}
