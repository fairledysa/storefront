// FILE: apps/storefront/src/themes/malak/screens/cart/_components/options-logic.ts
import type { ProductOption, ProductVariant, VariantLink } from "./types";

function setEqSubset(selected: Set<string>, candidate: Set<string>) {
  for (const x of selected) {
    if (!candidate.has(x)) return false;
  }
  return true;
}

function isVariantSellable(variant: ProductVariant) {
  const unlimited = Boolean(variant?.unlimited_quantity ?? false);
  if (unlimited) return true;

  const qty = Number(variant?.stock_quantity ?? 0);
  return Number.isFinite(qty) && qty > 0;
}

export function buildVariantMap(variant_links: VariantLink[]) {
  const map = new Map<string, Set<string>>();
  for (const l of variant_links || []) {
    const vid = String(l.variant_id);
    const oid = String(l.option_value_id);
    if (!map.has(vid)) map.set(vid, new Set());
    map.get(vid)!.add(oid);
  }
  return map;
}

export function getSellableVariantIds(variants: ProductVariant[]) {
  return new Set(
    (variants || [])
      .filter((v) => isVariantSellable(v))
      .map((v) => String(v.id))
      .filter(Boolean),
  );
}

export function resolveVariantIdFromSelection(args: {
  variants: ProductVariant[];
  variant_links: VariantLink[];
  selected_value_ids: string[];
}): string | null {
  const selected = new Set(
    (args.selected_value_ids || []).map(String).filter(Boolean),
  );
  if (selected.size === 0) return null;

  const vmap = buildVariantMap(args.variant_links || []);
  const sellableIds = getSellableVariantIds(args.variants || []);

  const candidates = (args.variants || [])
    .map((v) => String(v.id))
    .filter(Boolean)
    .filter((vid) => sellableIds.has(vid))
    .filter((vid) => {
      const set = vmap.get(vid) ?? new Set<string>();
      return setEqSubset(selected, set);
    });

  if (!candidates.length) return null;
  return candidates[0];
}

export function computeAllowedValues(args: {
  options: ProductOption[];
  variants: ProductVariant[];
  variant_links: VariantLink[];
  selectedByOptionId: Record<string, string | null>;
}) {
  const vmap = buildVariantMap(args.variant_links || []);
  const sellableIds = getSellableVariantIds(args.variants || []);

  const variantSets = new Map<string, Set<string>>();
  for (const vid of sellableIds) {
    variantSets.set(vid, vmap.get(vid) ?? new Set());
  }

  const selectedAll = new Set(
    Object.values(args.selectedByOptionId || {})
      .filter(Boolean)
      .map((x) => String(x)),
  );

  const allowedByOption = new Map<string, Set<string>>();

  for (const opt of args.options || []) {
    const optId = String(opt.id);
    const allowed = new Set<string>();

    for (const val of opt.values || []) {
      const valId = String(val.id);

      const testSelected = new Set(selectedAll);

      const old = args.selectedByOptionId?.[optId];
      if (old) testSelected.delete(String(old));

      testSelected.add(valId);

      let ok = false;
      for (const [, set] of variantSets.entries()) {
        if (setEqSubset(testSelected, set)) {
          ok = true;
          break;
        }
      }

      if (ok) allowed.add(valId);
    }

    allowedByOption.set(optId, allowed);
  }

  return allowedByOption;
}

export function buildDefaultSelection(
  options: ProductOption[],
  selectedIds?: string[] | null,
) {
  const selectedSet = new Set((selectedIds || []).map(String).filter(Boolean));
  const out: Record<string, string | null> = {};

  for (const opt of options || []) {
    const hit = (opt.values || []).find((v) => selectedSet.has(String(v.id)));
    if (hit) {
      out[String(opt.id)] = String(hit.id);
      continue;
    }

    const def =
      (opt.values || []).find((v: any) => v?.is_default) ||
      (opt.values || [])[0];

    out[String(opt.id)] = def ? String(def.id) : null;
  }

  return out;
}