// FILE: apps/storefront/src/themes/malak/app-shell/Footer.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type CSSProperties,
} from "react";
import Icon from "@/components/icon/Icon";
import type {
  MalakBootstrap,
  MalakBootstrapFooterLink,
  MalakBootstrapHelpItem,
  MalakBootstrapSocial,
} from "../bootstrap/types";

type IconName = ComponentProps<typeof Icon>["icon"];

type Item = {
  label: string;
  href: string;
};

type HelpItem = {
  title: string;
  value: string;
  icon: IconName;
  href: string;
};

type Social = {
  icon: IconName;
  href: string;
  label: string;
};

type FooterColumn = {
  title: string;
  items: Item[];
};

type StoreFooterPage = {
  label: string;
  href: string;
};

type FloatingSide = "right" | "left";

type Props = {
  theme?: any;
  bootstrap?: MalakBootstrap;
};

const MANUAL_DEFAULT_FOOTER_HREFS_TO_REMOVE = new Set([
  "/company",
  "/careers",
  "/terms",
  "/returns",
  "/privacy",
]);

const MANUAL_DEFAULT_FOOTER_LABELS_TO_REMOVE = new Set([
  "موقع الشركة",
  "الوظائف",
  "الشروط والأحكام",
  "سياسة الإستبدال والإسترجاع",
  "سياسة الاستبدال والاسترجاع",
  "الخصوصية",
]);

const ACCOUNT_COLUMN: FooterColumn = {
  title: "حسابي",
  items: [
    { label: "حسابي", href: "/account" },
    { label: "الطلبات", href: "/account/orders" },
    { label: "المفضلات", href: "/account/favorites" },
  ],
};

function text(value: any) {
  return String(value ?? "").trim();
}

function pickText(...values: any[]) {
  for (const value of values) {
    const t = text(value);
    if (t) return t;
  }

  return "";
}

function readBool(value: any, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const v = value.trim().toLowerCase();

    if (["true", "1", "yes", "on"].includes(v)) return true;
    if (["false", "0", "no", "off"].includes(v)) return false;
  }

  if (value && typeof value === "object") {
    if ("enabled" in value) return readBool(value.enabled, fallback);
    if ("value" in value) return readBool(value.value, fallback);
    if ("checked" in value) return readBool(value.checked, fallback);
  }

  return fallback;
}

function readNumber(value: any, fallback = 0, min?: number, max?: number) {
  let n: number;

  if (value && typeof value === "object" && "value" in value) {
    n = Number(value.value);
  } else {
    n = Number(value);
  }

  if (!Number.isFinite(n)) n = fallback;

  if (typeof min === "number") n = Math.max(min, n);
  if (typeof max === "number") n = Math.min(max, n);

  return n;
}

function normalizeSide(value: any, fallback: FloatingSide): FloatingSide {
  return text(value) === "left" ? "left" : fallback;
}

function normalizeHref(value: any) {
  const href = text(value);
  if (!href) return "#";

  if (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("/") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  ) {
    return href;
  }

  return `/${href}`;
}

function normalizeExternalHref(value: any) {
  const href = text(value);
  if (!href) return "#";

  if (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  ) {
    return href;
  }

  return `https://${href}`;
}

function normalizePhoneHref(value: any) {
  const phone = text(value);
  if (!phone) return "#";

  return `tel:${phone.replace(/\s+/g, "")}`;
}

function normalizeWhatsappHref(value: any) {
  const raw = text(value);
  if (!raw) return "#";

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  const clean = raw.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (!clean) return "#";

  return `https://wa.me/${clean}`;
}

function normalizeTelegramHref(value: any) {
  const raw = text(value);
  if (!raw) return "#";

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  const clean = raw.replace(/^@+/, "");
  if (!clean) return "#";

  return `https://t.me/${clean}`;
}

function normalizeSocialHref(label: any, href: any) {
  const raw = text(href);
  if (!raw) return "#";

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  const key = text(label).toLowerCase();
  const clean = raw.replace(/^@+/, "");

  if (key.includes("instagram") || key.includes("انست")) {
    return `https://instagram.com/${clean}`;
  }

  if (
    key === "x" ||
    key.includes("twitter") ||
    key.includes("تويتر") ||
    key.includes("إكس") ||
    key.includes("اكس")
  ) {
    return `https://x.com/${clean}`;
  }

  if (key.includes("snap") || key.includes("سناب")) {
    return `https://snapchat.com/add/${clean}`;
  }

  if (key.includes("tiktok") || key.includes("تيك")) {
    return `https://www.tiktok.com/@${clean}`;
  }

  if (key.includes("youtube") || key.includes("يوتيوب")) {
    return `https://youtube.com/${clean}`;
  }

  if (key.includes("facebook") || key.includes("فيس")) {
    return `https://facebook.com/${clean}`;
  }

  if (key.includes("linkedin") || key.includes("لينكد")) {
    return `https://linkedin.com/in/${clean}`;
  }

  return normalizeExternalHref(raw);
}

function socialIconFor(label: any, incomingIcon?: any): IconName {
  const key = text(label).toLowerCase();
  const icon = text(incomingIcon);

  if (key.includes("instagram") || key.includes("انست")) {
    return "Instagram" as IconName;
  }

  if (
    key === "x" ||
    key.includes("twitter") ||
    key.includes("تويتر") ||
    key.includes("إكس") ||
    key.includes("اكس")
  ) {
    return "TwitterSquare" as IconName;
  }

  if (key.includes("snap") || key.includes("سناب")) {
    return "Snapchat" as IconName;
  }

  if (key.includes("tiktok") || key.includes("تيك")) {
    return "Tiktok" as IconName;
  }

  if (key.includes("youtube") || key.includes("يوتيوب")) {
    return "Youtube" as IconName;
  }

  if (key.includes("facebook") || key.includes("فيس")) {
    return "Facebook01" as IconName;
  }

  if (key.includes("linkedin") || key.includes("لينكد")) {
    return "Linkedin01" as IconName;
  }

  if (icon && icon !== "Link01" && icon !== "Link02" && icon !== "Link03") {
    return icon as IconName;
  }

  return "Link01" as IconName;
}

function helpIconFor(title: any, incomingIcon?: any): IconName {
  const key = text(title).toLowerCase();
  const icon = text(incomingIcon);

  if (key.includes("اتصال") || key.includes("جوال") || key.includes("phone")) {
    return "Phone01" as IconName;
  }

  if (key.includes("واتساب") || key.includes("whatsapp")) {
    return "Whatsapp" as IconName;
  }

  if (key.includes("بريد") || key.includes("email") || key.includes("mail")) {
    return "Mail01" as IconName;
  }

  if (key.includes("تلي") || key.includes("telegram")) {
    return "Telegram" as IconName;
  }

  if (key.includes("مساعدة") || key.includes("help")) {
    return "HelpCircle" as IconName;
  }

  if (icon && icon !== "Link01" && icon !== "Link02" && icon !== "Link03") {
    return icon as IconName;
  }

  return "HelpCircle" as IconName;
}

function normalizeHelpHref(item: MalakBootstrapHelpItem) {
  const title = text(item?.title).toLowerCase();
  const value = text(item?.value);
  const href = text(item?.href);

  if (href && href !== "#") {
    if (
      href.startsWith("http://") ||
      href.startsWith("https://") ||
      href.startsWith("/") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:")
    ) {
      return href;
    }

    return normalizeExternalHref(href);
  }

  if (
    title.includes("اتصال") ||
    title.includes("جوال") ||
    title.includes("phone")
  ) {
    return normalizePhoneHref(value);
  }

  if (title.includes("واتساب") || title.includes("whatsapp")) {
    return normalizeWhatsappHref(value);
  }

  if (
    title.includes("بريد") ||
    title.includes("email") ||
    title.includes("mail")
  ) {
    return value ? `mailto:${value}` : "#";
  }

  if (title.includes("تلي") || title.includes("telegram")) {
    return normalizeTelegramHref(value);
  }

  return normalizeExternalHref(value);
}

function normalizeHelpItems(bootstrap?: MalakBootstrap): HelpItem[] {
  const items = bootstrap?.footer?.help_items;

  if (!Array.isArray(items)) return [];

  return items
    .map((x: MalakBootstrapHelpItem) => ({
      title: text(x?.title),
      value: text(x?.value),
      icon: helpIconFor(x?.title, x?.icon),
      href: normalizeHelpHref(x),
    }))
    .filter((x) => x.title && x.value && x.href && x.href !== "#");
}

function buildHelpCenterItem(bootstrap?: MalakBootstrap): HelpItem | null {
  const footer: any = bootstrap?.footer || {};

  const rawTitle = pickText(
    footer?.help_center_title,
    footer?.help?.center_title,
    footer?.help?.help_center_title,
    footer?.help_center?.title,
  );

  const rawUrl = pickText(
    footer?.help_center_url,
    footer?.help?.center_url,
    footer?.help?.help_center_url,
    footer?.help_center?.url,
    footer?.help_url,
  );

  const href = normalizeExternalHref(rawUrl);

  if (!rawTitle || !rawUrl || href === "#") return null;

  return {
    title: rawTitle,
    value: rawUrl,
    icon: "HelpCircle" as IconName,
    href,
  };
}

function mergeHelpItems(args: {
  items: HelpItem[];
  helpCenter: HelpItem | null;
}) {
  const out = [...args.items];

  if (args.helpCenter) {
    const exists = out.some((item) => {
      const title = text(item.title).toLowerCase();
      const href = text(item.href).toLowerCase();

      return (
        title.includes("مركز") ||
        title.includes("help") ||
        href === text(args.helpCenter?.href).toLowerCase()
      );
    });

    if (!exists) out.push(args.helpCenter);
  }

  return out;
}

function normalizeSocials(bootstrap?: MalakBootstrap): Social[] {
  const socials = bootstrap?.footer?.socials;

  if (!Array.isArray(socials)) return [];

  return socials
    .map((x: MalakBootstrapSocial) => {
      const label = text(x?.label) || "رابط";
      const href = normalizeSocialHref(label, x?.href);

      return {
        icon: socialIconFor(label, x?.icon),
        href,
        label,
      };
    })
    .filter((x) => x.href && x.href !== "#");
}

function normalizePayments(bootstrap?: MalakBootstrap): string[] {
  const payments = bootstrap?.footer?.payments;

  if (!Array.isArray(payments)) return [];

  return payments
    .map((x: any) => text(x?.image_url || x?.src || x?.url || x))
    .filter(Boolean);
}

function normalizeColumns(bootstrap?: MalakBootstrap): FooterColumn[] {
  const columns = bootstrap?.footer?.columns;

  if (!Array.isArray(columns)) return [];

  return columns
    .map((col: any) => {
      const title = text(col?.title);

      const items = Array.isArray(col?.items)
        ? col.items
            .map((it: MalakBootstrapFooterLink) => ({
              label: text(it?.label),
              href: normalizeHref(it?.href),
            }))
            .filter((it: Item) => it.label && it.href && it.href !== "#")
        : [];

      return {
        title,
        items,
      };
    })
    .filter((col) => col.title && col.items.length > 0);
}

function normalizeStorePages(bootstrap?: MalakBootstrap): StoreFooterPage[] {
  const footerAny: any = bootstrap?.footer || {};
  const pages = footerAny.store_pages;

  if (!Array.isArray(pages)) return [];

  return pages
    .map((page: any) => ({
      label: text(page?.label),
      href: normalizeHref(page?.href),
    }))
    .filter((page) => page.label && page.href && page.href !== "#");
}

function buildFallbackCategoryColumn(bootstrap?: MalakBootstrap): FooterColumn {
  const categoryItems: Item[] =
    Array.isArray(bootstrap?.navigation?.categories) &&
    bootstrap.navigation.categories.length > 0
      ? bootstrap.navigation.categories.slice(0, 8).map((cat: any) => ({
          label: text(cat.name),
          href: normalizeHref(cat.href),
        }))
      : [];

  return {
    title: "أشهر التصنيفات",
    items: categoryItems,
  };
}

function isAccountColumn(column: FooterColumn) {
  const title = text(column.title);
  if (title === "حسابي") return true;

  return column.items.some((item) => {
    const href = normalizeHref(item.href);

    return (
      href === "/account" ||
      href === "/account/orders" ||
      href === "/account/favorites"
    );
  });
}

function removeManualDefaultFooterLinks(columns: FooterColumn[]) {
  return columns
    .map((column) => {
      if (isAccountColumn(column)) return column;

      const items = column.items.filter((item) => {
        const href = normalizeHref(item.href);
        const label = text(item.label);

        if (MANUAL_DEFAULT_FOOTER_HREFS_TO_REMOVE.has(href)) return false;
        if (MANUAL_DEFAULT_FOOTER_LABELS_TO_REMOVE.has(label)) return false;

        return true;
      });

      return {
        ...column,
        items,
      };
    })
    .filter((column) => column.title && column.items.length > 0);
}

function ensureBlogInStoreColumn(columns: FooterColumn[], storeName: string) {
  const normalizedStoreName = text(storeName);
  const blogItem: Item = { label: "المدونة", href: "/blog" };

  let foundStoreColumn = false;

  const nextColumns = columns.map((column) => {
    if (text(column.title) !== normalizedStoreName) return column;

    foundStoreColumn = true;

    const hasBlog = column.items.some(
      (item) => normalizeHref(item.href) === "/blog",
    );

    return {
      ...column,
      items: hasBlog ? column.items : [blogItem, ...column.items],
    };
  });

  if (!foundStoreColumn) {
    nextColumns.push({
      title: normalizedStoreName || "المتجر",
      items: [blogItem],
    });
  }

  return nextColumns;
}

function injectStorePagesUnderBlog(args: {
  columns: FooterColumn[];
  storeName: string;
  storePages: StoreFooterPage[];
}) {
  if (!args.storePages.length) return args.columns;

  const storeName = text(args.storeName);

  let storeColumnIndex = args.columns.findIndex(
    (column) => text(column.title) === storeName,
  );

  if (storeColumnIndex < 0) {
    storeColumnIndex = args.columns.findIndex((column) =>
      column.items.some(
        (item) =>
          text(item.label) === "المدونة" ||
          normalizeHref(item.href) === "/blog",
      ),
    );
  }

  const nextColumns = args.columns.map((column) => ({
    ...column,
    items: [...column.items],
  }));

  if (storeColumnIndex < 0) {
    nextColumns.push({
      title: storeName || "المتجر",
      items: [{ label: "المدونة", href: "/blog" }, ...args.storePages],
    });

    return nextColumns;
  }

  const target = nextColumns[storeColumnIndex];

  const cleanItems = target.items.filter((item) => {
    const href = normalizeHref(item.href);
    const label = text(item.label);

    if (MANUAL_DEFAULT_FOOTER_HREFS_TO_REMOVE.has(href)) return false;
    if (MANUAL_DEFAULT_FOOTER_LABELS_TO_REMOVE.has(label)) return false;

    return true;
  });

  const blogIndex = cleanItems.findIndex(
    (item) =>
      text(item.label) === "المدونة" || normalizeHref(item.href) === "/blog",
  );

  if (blogIndex >= 0) {
    target.items = [
      ...cleanItems.slice(0, blogIndex + 1),
      ...args.storePages,
      ...cleanItems.slice(blogIndex + 1),
    ];
  } else {
    target.items = [
      { label: "المدونة", href: "/blog" },
      ...args.storePages,
      ...cleanItems,
    ];
  }

  nextColumns[storeColumnIndex] = target;

  return nextColumns;
}

function ensureAccountColumn(columns: FooterColumn[]) {
  const hasAccount = columns.some((column) => isAccountColumn(column));
  if (hasAccount) return columns;

  return [...columns, ACCOUNT_COLUMN];
}

function buildFooterColumns(args: {
  columnsFromDb: FooterColumn[];
  fallbackCategoryColumn: FooterColumn;
  storeName: string;
  storePages: StoreFooterPage[];
}) {
  const sourceColumns =
    args.columnsFromDb.length > 0
      ? args.columnsFromDb
      : [
          args.fallbackCategoryColumn,
          {
            title: args.storeName,
            items: [{ label: "المدونة", href: "/blog" }],
          },
        ];

  const cleanedColumns = removeManualDefaultFooterLinks(sourceColumns);
  const withBlog = ensureBlogInStoreColumn(cleanedColumns, args.storeName);

  const withStorePages = injectStorePagesUnderBlog({
    columns: withBlog,
    storeName: args.storeName,
    storePages: args.storePages,
  });

  const withAccount = ensureAccountColumn(withStorePages);

  return withAccount.filter((column) => column.items.length > 0);
}

function isExternalHref(href: string) {
  return (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  );
}

function paymentLabelFromSrc(src: string) {
  const file = text(src).split("/").pop() || "";
  const name = file.split(".")[0] || "";

  const labels: Record<string, string> = {
    gpay: "GPay",
    googlepay: "GPay",
    google_pay: "GPay",
    "google-pay": "GPay",
    stc: "STC Pay",
    stcpay: "STC Pay",
    stc_pay: "STC Pay",
    "stc-bank": "STC Pay",
    amex: "AMEX",
    tabby: "Tabby",
    applepay: "Apple Pay",
    apple_pay: "Apple Pay",
    "apple-pay": "Apple Pay",
    tamara: "Tamara",
    mastercard: "Mastercard",
    master_card: "Mastercard",
    "master-card": "Mastercard",
    visa: "Visa",
    mada: "Mada",
    express: "Express Pay",
    "express-pay": "Express Pay",
  };

  return labels[name.toLowerCase()] || name || "دفع";
}

function buildWhatsappInteractiveMessage(args: {
  storeName: string;
  pageUrl: string;
  pathname: string;
}) {
  const path = text(args.pathname);

  if (path.includes("/product") || path.includes("/products")) {
    return `مرحباً، أحتاج مساعدة بخصوص هذا المنتج من ${args.storeName}:\n${args.pageUrl}`;
  }

  if (path.includes("/order") || path.includes("/orders")) {
    return `مرحباً، أحتاج مساعدة بخصوص هذا الطلب من ${args.storeName}:\n${args.pageUrl}`;
  }

  return `مرحباً، أحتاج مساعدة من ${args.storeName}.\n${args.pageUrl}`;
}

function buildWhatsappUrl(args: {
  number: string;
  interactive: boolean;
  storeName: string;
  pageUrl: string;
  pathname: string;
}) {
  const clean = text(args.number).replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (!clean) return "#";

  if (!args.interactive) return `https://wa.me/${clean}`;

  const message = buildWhatsappInteractiveMessage({
    storeName: args.storeName,
    pageUrl: args.pageUrl,
    pathname: args.pathname,
  });

  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

function AppDownloadButton({
  href,
  type,
}: {
  href: string;
  type: "android" | "ios";
}) {
  const isAndroid = type === "android";

  return (
    <a
      className="mk-footer__appBtn"
      href={href}
      aria-label={isAndroid ? "Google Play" : "App Store"}
      target="_blank"
      rel="noreferrer"
    >
      <span className="mk-footer__appIcon">
        <Icon
          icon={(isAndroid ? "CustomGooglePlay" : "CustomAppleAppStore") as any}
          size={22 as any}
        />
      </span>

      <span className="mk-footer__appText">
        <span>{isAndroid ? "Google Play" : "App Store"}</span>
        <small>تحميل التطبيق</small>
      </span>
    </a>
  );
}

function PaymentLogo({ src }: { src: string }) {
  const [broken, setBroken] = useState(false);

  if (!src) return null;

  if (broken) {
    return (
      <span className="mk-footer__payLogo mk-footer__payLogo--text">
        {paymentLabelFromSrc(src)}
      </span>
    );
  }

  return (
    <span className="mk-footer__payLogo" title={paymentLabelFromSrc(src)}>
      <img
        src={src}
        alt={paymentLabelFromSrc(src)}
        onError={() => setBroken(true)}
      />
    </span>
  );
}

function CertificateModal({
  open,
  image,
  title,
  link,
  onClose,
}: {
  open: boolean;
  image: string;
  title: string;
  link: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="mk-footer-cert-modal"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={onClose}
    >
      <div
        className="mk-footer-cert-modal__card"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mk-footer-cert-modal__head">
          <button
            type="button"
            className="mk-footer-cert-modal__close"
            onClick={onClose}
            aria-label="إغلاق"
          >
            ×
          </button>

          <div className="mk-footer-cert-modal__title">{title}</div>
        </div>

        <div className="mk-footer-cert-modal__body">
          <img src={image} alt={title} />
        </div>

        {link && link !== "#" ? (
          <div className="mk-footer-cert-modal__foot">
            <a
              href={normalizeExternalHref(link)}
              target="_blank"
              rel="noreferrer"
              className="mk-footer-cert-modal__link"
            >
              فتح رابط الشهادة
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function Footer({ theme, bootstrap }: Props) {
  const pathname = usePathname();
  const year = useMemo(() => new Date().getFullYear(), []);

  const [certificateOpen, setCertificateOpen] = useState(false);
  const [pageUrl, setPageUrl] = useState("");

  useEffect(() => {
    setPageUrl(window.location.href);
  }, [pathname]);

  const footerEnabled = bootstrap?.footer?.enabled !== false;

  const footerAny: any = bootstrap?.footer || {};
  const footerOptions: any = footerAny?.options || {};
  const headerAny: any = bootstrap?.header || {};
  const storeAny: any = bootstrap?.store || {};
  const storefront = theme?.storefront || {};

  const baseFooterLogo =
    footerAny?.logo_url ||
    footerAny?.logoUrl ||
    footerAny?.logo?.url ||
    headerAny?.logo_url ||
    storeAny?.logo_url ||
    theme?.store?.logoUrl ||
    null;

  const reversedFooterLogo =
    storefront?.showReversedLogoInFooter && storefront?.reversedLogoUrl
      ? storefront.reversedLogoUrl
      : null;

  const footerLogoUrl = reversedFooterLogo || baseFooterLogo;

  const footerLogoAlt = pickText(
    footerAny?.logo_alt,
    footerAny?.logoAlt,
    headerAny?.logo_alt,
    headerAny?.logoAlt,
    storeAny?.name,
    theme?.store?.name,
    "Logo",
  );

  const showPayments = footerAny?.show_payments !== false;
  const showApps = footerAny?.show_apps !== false;
  const showSocial = footerAny?.show_social !== false;

  const footerLogoWidth = readNumber(
    footerOptions.footer_logo_width,
    0,
    0,
    300,
  );

  const footerLogoHeight = readNumber(
    footerOptions.footer_logo_height,
    64,
    0,
    120,
  );

  const footerIsDark = readBool(footerOptions.footer_is_dark, false);

  const footerBg = pickText(footerOptions.footer_bg);
  const footerTextColor = pickText(footerOptions.footer_text_color);
  const bottomFooterBg = pickText(footerOptions.bottom_footer_bg);

  const showBasicFooter = readBool(footerOptions.show_basic_footer, false);
  const enhancedLinks = readBool(footerOptions.enhanced_links, true);
  const linksWithBullits = readBool(footerOptions.links_with_bullits, false);
  const enhancedSocialIcons = readBool(
    footerOptions.enhanced_social_icons,
    true,
  );
  const roundedContacts = readBool(footerOptions.rounded_contacts, true);
  const miniSbc = readBool(footerOptions.mini_sbc, false);
  const footerShowNewsletter = readBool(
    footerOptions.footer_show_newsletter,
    false,
  );
  const showFooterLogos = readBool(footerOptions.show_footer_logos, false);
  const enableBottomNav = readBool(footerOptions.enable_bottom_nav, false);

  const footerClassName = [
    "mk-footer",
    footerIsDark ? "mk-footer--dark" : "",
    showBasicFooter ? "mk-footer--basic" : "",
    enhancedLinks ? "mk-footer--enhanced-links" : "mk-footer--plain-links",
    linksWithBullits ? "mk-footer--links-bullits" : "",
    enhancedSocialIcons ? "mk-footer--enhanced-social" : "",
    roundedContacts ? "mk-footer--rounded-contacts" : "",
    miniSbc ? "mk-footer--mini-sbc" : "",
    showFooterLogos ? "mk-footer--show-logos" : "",
    enableBottomNav ? "mk-footer--bottom-nav-enabled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const footerStyle = {
    ...(footerBg ? { "--mk-bg-footer": footerBg } : {}),
    ...(footerTextColor ? { "--mk-text-footer": footerTextColor } : {}),
    ...(bottomFooterBg ? { "--mk-bg-footer-bottom": bottomFooterBg } : {}),
    ...(footerLogoWidth > 0
      ? { "--mk-footer-logo-max-width": `${footerLogoWidth}px` }
      : {}),
    ...(footerLogoHeight > 0
      ? { "--mk-footer-logo-max-height": `${footerLogoHeight}px` }
      : {}),
  } as CSSProperties;

  const storeName = pickText(storeAny?.name, theme?.store?.name, "المتجر");

  const helpTitle = pickText(footerAny?.help?.title, footerAny?.help_title);

  const helpSubtitle = pickText(
    footerAny?.help?.subtitle,
    footerAny?.help_subtitle,
  );

  const helpBackgroundColor = pickText(
    footerAny?.help_background_color,
    footerAny?.help?.background_color,
    footerAny?.help_bg,
    "#9b7ad6",
  );

  const helpTextColor = pickText(
    footerAny?.help_text_color,
    footerAny?.help?.text_color,
    footerAny?.help_color,
    "#ffffff",
  );

  const helpItemsFromDb = normalizeHelpItems(bootstrap);
  const helpCenterItem = buildHelpCenterItem(bootstrap);

  const topHelp: HelpItem[] = mergeHelpItems({
    items: helpItemsFromDb,
    helpCenter: helpCenterItem,
  });

  const showHelpBlock =
    Boolean(helpTitle) || Boolean(helpSubtitle) || topHelp.length > 0;

  const columnsFromDb = normalizeColumns(bootstrap);
  const storePages = normalizeStorePages(bootstrap);
  const fallbackCategoryColumn = buildFallbackCategoryColumn(bootstrap);

  const cols = buildFooterColumns({
    columnsFromDb,
    fallbackCategoryColumn,
    storeName,
    storePages,
  });

  const socials = normalizeSocials(bootstrap);
  const payments = normalizePayments(bootstrap);

  const iosUrl = normalizeExternalHref(footerAny?.app?.ios || "");
  const androidUrl = normalizeExternalHref(footerAny?.app?.android || "");

  const hasIos = iosUrl && iosUrl !== "#";
  const hasAndroid = androidUrl && androidUrl !== "#";
  const hasAnyApp = hasIos || hasAndroid;

  const commercialRegister = pickText(footerAny?.commercial_register);
  const taxNumber = pickText(footerAny?.tax_number);

  const copyrightText = pickText(
    footerAny?.copyright_text,
    footerAny?.copyright,
    "جميع الحقوق محفوظة",
  );

  const businessCertificate = footerAny?.business_certificate;
  const businessCertificateImage = text(businessCertificate?.image_url);
  const businessCertificateLink = text(businessCertificate?.link);
  const businessCertificateTitle = pickText(
    businessCertificate?.title,
    "شهادة منصة الأعمال",
  );

  const showBusinessCertificate =
    Boolean(businessCertificate?.enabled) && Boolean(businessCertificateImage);

  const floatingAny = footerAny?.floating_actions || {};

  const scrollTopEnabled = readBool(floatingAny.scroll_top_enabled, false);
  const scrollTopPosition = normalizeSide(
    floatingAny.scroll_top_position,
    "right",
  );

  const whatsappEnabled = readBool(floatingAny.wa_enabled, false);
  const whatsappNumber = pickText(floatingAny.wa_number);
  const whatsappBg = pickText(floatingAny.wa_btn_bg, "#22c55e");
  const whatsappColor = pickText(floatingAny.wa_btn_text_color, "#ffffff");
  const whatsappText = pickText(floatingAny.wa_btn_text);
  const whatsappInteractive = readBool(floatingAny.interactive_wa, false);
  const whatsappPosition = normalizeSide(floatingAny.wa_position, "right");

  const phoneEnabled = readBool(floatingAny.phone_btn_enabled, false);
  const phoneNumber = pickText(floatingAny.phone_number);
  const phonePosition = normalizeSide(
    floatingAny.phone_position,
    whatsappPosition,
  );

  const whatsappHref = buildWhatsappUrl({
    number: whatsappNumber,
    interactive: whatsappInteractive,
    storeName,
    pageUrl: pageUrl || "/",
    pathname: pathname || "/",
  });

  const phoneHref = normalizePhoneHref(phoneNumber);

  const hasRightFloating =
    (scrollTopEnabled && scrollTopPosition === "right") ||
    (whatsappEnabled && whatsappHref !== "#" && whatsappPosition === "right") ||
    (phoneEnabled && phoneHref !== "#" && phonePosition === "right");

  const hasLeftFloating =
    (scrollTopEnabled && scrollTopPosition === "left") ||
    (whatsappEnabled && whatsappHref !== "#" && whatsappPosition === "left") ||
    (phoneEnabled && phoneHref !== "#" && phonePosition === "left");

  if (!footerEnabled) return null;

  const renderFloatingButtons = (side: FloatingSide) => {
    const showWhatsapp =
      whatsappEnabled && whatsappHref !== "#" && whatsappPosition === side;

    const showPhone =
      phoneEnabled && phoneHref !== "#" && phonePosition === side;

    const showScrollTop = scrollTopEnabled && scrollTopPosition === side;

    if (!showWhatsapp && !showPhone && !showScrollTop) return null;

    return (
      <div
        className={[
          "mk-floating-actions",
          side === "left"
            ? "mk-floating-actions--left"
            : "mk-floating-actions--right",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {showWhatsapp ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="mk-floating-actions__btn mk-floating-actions__btn--whatsapp"
            style={
              {
                "--mk-wa-bg": whatsappBg,
                "--mk-wa-color": whatsappColor,
              } as CSSProperties
            }
            aria-label={whatsappText || "واتساب"}
            title={whatsappText || "واتساب"}
          >
            <Icon icon={"Whatsapp" as any} size={22 as any} />

            {whatsappText ? (
              <span className="mk-floating-actions__label">
                {whatsappText}
              </span>
            ) : null}
          </a>
        ) : null}

        {showPhone ? (
          <a
            href={phoneHref}
            className="mk-floating-actions__btn mk-floating-actions__btn--phone"
            aria-label="اتصال"
            title="اتصال"
          >
            <Icon icon={"Phone01" as any} size={20 as any} />
          </a>
        ) : null}

        {showScrollTop ? (
          <button
            type="button"
            className="mk-floating-actions__btn mk-floating-actions__btn--top"
            aria-label="الرجوع للأعلى"
            title="الرجوع للأعلى"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <Icon icon="ArrowUp01" size={18 as any} />
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <footer className={footerClassName} style={footerStyle} dir="rtl">
        {showHelpBlock ? (
          <div
            className="mk-footer__help"
            style={
              {
                "--mk-help-bg": helpBackgroundColor,
                "--mk-help-text": helpTextColor,
                backgroundColor: helpBackgroundColor,
                color: helpTextColor,
              } as CSSProperties
            }
          >
            <div className="mk-footer__container mk-footer__helpRow">
              {helpTitle || helpSubtitle ? (
                <div className="mk-footer__helpText">
                  {helpTitle ? (
                    <div className="mk-footer__helpTitle">{helpTitle}</div>
                  ) : null}

                  {helpSubtitle ? (
                    <div className="mk-footer__helpSub">{helpSubtitle}</div>
                  ) : null}
                </div>
              ) : null}

              {topHelp.length > 0 ? (
                <div className="mk-footer__helpLinks">
                  {topHelp.map((x) => (
                    <a
                      key={`${x.title}-${x.value}`}
                      href={x.href}
                      className="mk-footer__helpItem"
                      target={isExternalHref(x.href) ? "_blank" : undefined}
                      rel={isExternalHref(x.href) ? "noreferrer" : undefined}
                    >
                      <span className="mk-footer__helpIcon">
                        <Icon icon={x.icon as any} size={25 as any} />
                      </span>

                      <span className="mk-footer__helpBody">
                        <span className="mk-footer__helpItemTitle">
                          {x.title}
                        </span>
                        <span className="mk-footer__helpItemValue">
                          {x.value}
                        </span>
                      </span>
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mk-footer__main">
          <div className="mk-footer__container mk-footer__grid">
            {footerLogoUrl ? (
              <div className="mk-footer__col mk-footer__brandCol">
                <Link href="/" className="mk-footer__brandLogoLink">
                  <img
                    src={footerLogoUrl}
                    alt={footerLogoAlt}
                    className="mk-footer__brandLogo"
                    style={
                      {
                        ...(footerLogoWidth > 0
                          ? { maxWidth: footerLogoWidth }
                          : {}),
                        ...(footerLogoHeight > 0
                          ? { maxHeight: footerLogoHeight }
                          : {}),
                      } as CSSProperties
                    }
                  />
                </Link>

                <p className="mk-footer__brandText">{storeName}</p>
              </div>
            ) : null}

            {cols.map((col, index) => (
              <div key={`${col.title}-${index}`} className="mk-footer__col">
                <div className="mk-footer__colTitle">{col.title}</div>

                <div
                  className={
                    index === 0 ? "mk-footer__linksRow" : "mk-footer__linksCol"
                  }
                >
                  {col.items.map((it) => (
                    <Link
                      key={`${col.title}-${it.label}-${it.href}`}
                      href={it.href}
                      className="mk-footer__link"
                    >
                      {it.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            {showSocial && socials.length > 0 ? (
              <div className="mk-footer__col">
                <div className="mk-footer__colTitle">تواصل معنا</div>

                <div className="mk-footer__socialGrid">
                  {socials.map((s) => (
                    <a
                      key={`${s.label}-${s.href}`}
                      className={[
                        "mk-footer__socialBtn",
                        enhancedSocialIcons
                          ? "mk-footer__socialBtn--enhanced"
                          : "",
                        roundedContacts ? "mk-footer__socialBtn--rounded" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      href={s.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={s.label}
                      title={s.label}
                    >
                      <Icon icon={s.icon as any} size={18 as any} />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            {footerShowNewsletter ? (
              <div className="mk-footer__col mk-footer__newsletterCol">
                <div className="mk-footer__colTitle">النشرة البريدية</div>

                <form
                  className="mk-footer__newsletter"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <input
                    className="mk-footer__newsletterInput"
                    type="email"
                    inputMode="email"
                    placeholder="بريدك الإلكتروني"
                    aria-label="بريدك الإلكتروني"
                  />

                  <button className="mk-footer__newsletterBtn" type="submit">
                    اشتراك
                  </button>
                </form>
              </div>
            ) : null}

            {showApps && hasAnyApp ? (
              <div className="mk-footer__col">
                <div className="mk-footer__colTitle">حمل التطبيق</div>

                <div className="mk-footer__stores">
                  {hasAndroid ? (
                    <AppDownloadButton href={androidUrl} type="android" />
                  ) : null}

                  {hasIos ? (
                    <AppDownloadButton href={iosUrl} type="ios" />
                  ) : null}
                </div>
              </div>
            ) : null}

            {showBusinessCertificate ? (
              <div className="mk-footer__col mk-footer__certificateCol">
                <div className="mk-footer__colTitle">
                  {businessCertificateTitle}
                </div>

                <button
                  type="button"
                  className="mk-footer__certificate"
                  onClick={() => setCertificateOpen(true)}
                  aria-label={`فتح ${businessCertificateTitle}`}
                >
                  <img
                    src={businessCertificateImage}
                    alt={businessCertificateTitle}
                  />

                  <span className="mk-footer__certificateHint">
                    اضغط للتكبير
                  </span>
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mk-footer__bottom">
          <div className="mk-footer__container mk-footer__bottomRow">
            <div className="mk-footer__meta">
              <div>
                © {year} {copyrightText}
              </div>

              {commercialRegister || taxNumber ? (
                <div className="mk-footer__meta2">
                  {commercialRegister ? (
                    <span>رقم السجل التجاري — {commercialRegister}</span>
                  ) : null}

                  {commercialRegister && taxNumber ? (
                    <span className="mk-footer__dot">•</span>
                  ) : null}

                  {taxNumber ? <span>الرقم الضريبي — {taxNumber}</span> : null}
                </div>
              ) : null}
            </div>

            {showPayments && payments.length > 0 ? (
              <div className="mk-footer__paymentsBlock">
                <div className="mk-footer__paymentsTitle">وسائل الدفع</div>

                <div className="mk-footer__payments">
                  {payments.map((src) => (
                    <PaymentLogo key={src} src={src} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {hasRightFloating ? renderFloatingButtons("right") : null}
        {hasLeftFloating ? renderFloatingButtons("left") : null}
      </footer>

      <CertificateModal
        open={certificateOpen}
        image={businessCertificateImage}
        title={businessCertificateTitle}
        link={businessCertificateLink}
        onClose={() => setCertificateOpen(false)}
      />
    </>
  );
}