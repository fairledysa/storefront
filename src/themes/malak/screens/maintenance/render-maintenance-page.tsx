// FILE: apps/storefront/src/themes/malak/screens/maintenance/render-maintenance-page.tsx

import "server-only";

import { getSeoUrlMode } from "@/data/store/settings";
import { getMalakBootstrap } from "@/themes/malak/bootstrap/get-malak-bootstrap";
import type {
  MalakBootstrap,
  MalakBootstrapHelpItem,
} from "@/themes/malak/bootstrap/types";
import type { StoreMaintenanceSettings } from "@/data/store/maintenance";

import MaintenanceScreen from "./MaintenanceScreen";
import MaintenanceThemeShell from "./MaintenanceThemeShell";

function s(value: unknown) {
  return String(value ?? "").trim();
}

function buildContactItems(args: {
  bootstrap: MalakBootstrap;
  settings: StoreMaintenanceSettings;
}) {
  if (!args.settings.show_contact_methods) return [];

  const helpItems = Array.isArray(args.bootstrap.footer?.help_items)
    ? args.bootstrap.footer.help_items
    : [];

  const socials = Array.isArray(args.bootstrap.footer?.socials)
    ? args.bootstrap.footer.socials
    : [];

  const items = [
    ...helpItems.map((item: MalakBootstrapHelpItem, index: number) => ({
      id: `help-${index}-${s(item.title)}`,
      title: s(item.title),
      value: s(item.value),
      href: s(item.href),
    })),

    ...socials.map((item, index: number) => ({
      id: `social-${index}-${s(item.label)}`,
      title: s(item.label),
      value: "",
      href: s(item.href),
    })),
  ];

  const seen = new Set<string>();

  return items.filter((item) => {
    if (!item.title || !item.href) return false;

    const key = item.href.toLowerCase();
    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

export async function renderMalakMaintenancePage(args: {
  ctx: any;
  settings: StoreMaintenanceSettings;
}) {
  const seoMode = await getSeoUrlMode(args.ctx.store.id);

  const bootstrap = await getMalakBootstrap({
    store: {
      id: args.ctx.store.id,
      slug: args.ctx.store.slug,
      name: args.ctx.store.name,
      logo_url: args.ctx.store.logo_url ?? null,
      favicon_url: args.ctx.store.favicon_url ?? null,
      description: args.ctx.store.description ?? null,
      default_currency: args.ctx.store.default_currency ?? null,
    },
    seoMode,
    themeOptions: args.ctx?.theme?.options ?? null,
    version_id: args.ctx?.theme?.version_id ?? "published",
  });

  const pageData = {
    route: "maintenance",

    store: {
      id: bootstrap.store.id,
      slug: bootstrap.store.slug ?? null,
      name: bootstrap.store.name,
      logo_url: bootstrap.store.logo_url ?? null,
      favicon_url: bootstrap.store.favicon_url ?? null,
      description: bootstrap.store.description ?? null,
    },

    appearance: bootstrap.appearance ?? {},

    maintenance: args.settings,

    contactItems: buildContactItems({
      bootstrap,
      settings: args.settings,
    }),
  };

  return (
    <MaintenanceThemeShell>
      <MaintenanceScreen data={pageData} />
    </MaintenanceThemeShell>
  );
}