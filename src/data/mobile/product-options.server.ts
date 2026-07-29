import type { ProductRow } from "@/data/catalog/products";
import type { MobileProductCard } from "./home/home.types";

type RawOption = Record<string, any>;
type RawOptionValue = Record<string, any>;
type RawVariant = Record<string, any>;

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function boolOrNull(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on", "enabled", "active"].includes(normalized)) return true;
    if (["false", "0", "no", "off", "disabled", "inactive"].includes(normalized)) return false;
  }
  return null;
}

function firstDefined(...values: unknown[]) {
  return values.find((value) => value !== undefined && value !== null);
}

function hasOptionValues(value: unknown): value is RawOption[] {
  return Array.isArray(value) && value.some((option) => Array.isArray(option?.values) && option.values.length > 0);
}

function productOptionsSource(row: ProductRow): RawOption[] {
  if (hasOptionValues(row.options)) return row.options as RawOption[];

  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  if (hasOptionValues(metadata.options)) return metadata.options;
  if (hasOptionValues(metadata?.seo?.options)) return metadata.seo.options;
  if (hasOptionValues((row.seo as any)?.options)) return (row.seo as any).options;

  return [];
}

function productVariantsSource(row: ProductRow): RawVariant[] {
  if (Array.isArray(row.variants) && row.variants.length > 0) return row.variants as RawVariant[];

  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  if (Array.isArray(metadata.variants) && metadata.variants.length > 0) return metadata.variants;
  if (Array.isArray(metadata?.seo?.variants) && metadata.seo.variants.length > 0) return metadata.seo.variants;
  if (Array.isArray((row.seo as any)?.variants) && (row.seo as any).variants.length > 0) return (row.seo as any).variants;

  return [];
}

function variantValueIds(variant: RawVariant): string[] {
  const ids = new Set<string>();

  for (const key of ["option_value_ids", "optionValueIds", "selected_option_value_ids", "selectedOptionValueIds"]) {
    const values = variant[key];
    if (!Array.isArray(values)) continue;
    for (const value of values) {
      const id = text(value);
      if (id) ids.add(id);
    }
  }

  for (const value of Array.isArray(variant.option_values) ? variant.option_values : []) {
    const id = text(value?.id) || text(value?.value_id) || text(value?.valueId);
    if (id) ids.add(id);
  }

  for (const value of Array.isArray(variant.values) ? variant.values : []) {
    const id = text(value?.id) || text(value?.value_id) || text(value?.valueId);
    if (id) ids.add(id);
  }

  for (const selection of Array.isArray(variant.selections) ? variant.selections : []) {
    const id =
      text(selection?.valueId) ||
      text(selection?.value_id) ||
      text(selection?.id) ||
      text(selection?.option_value_id) ||
      text(selection?.optionValueId);
    if (id) ids.add(id);
  }

  return Array.from(ids);
}

function productUnlimited(row: ProductRow): boolean {
  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return (
    row.stock?.unlimited_quantity === true ||
    boolOrNull(metadata.qtyUnlimited) === true ||
    boolOrNull(metadata.unlimited_quantity) === true ||
    boolOrNull(metadata.unlimitedQuantity) === true
  );
}

type InventorySnapshot = {
  available: boolean;
  quantity: number | null;
  unlimited_quantity: boolean;
};

function variantInventory(variant: RawVariant, unlimitedProduct: boolean): InventorySnapshot {
  if (unlimitedProduct) {
    return { available: true, quantity: null, unlimited_quantity: true };
  }

  const unlimited = boolOrNull(firstDefined(
    variant.unlimited_quantity,
    variant.unlimitedQuantity,
    variant.qtyUnlimited,
    variant.quantityUnlimited,
    variant?.metadata?.unlimited_quantity,
    variant?.metadata?.unlimitedQuantity,
  )) === true;

  if (unlimited) {
    return { available: true, quantity: null, unlimited_quantity: true };
  }

  const quantity = numberOrNull(firstDefined(
    variant.stock_quantity,
    variant.stockQuantity,
    variant.quantity,
    variant.qty,
    variant.stock,
    variant.available_qty,
    variant.availableQty,
    variant?.metadata?.stock_quantity,
    variant?.metadata?.stockQuantity,
    variant?.metadata?.quantity,
    variant?.metadata?.qty,
  ));

  if (quantity !== null) {
    const normalizedQuantity = Math.max(0, quantity);
    return {
      available: normalizedQuantity > 0,
      quantity: normalizedQuantity,
      unlimited_quantity: false,
    };
  }

  const available = boolOrNull(firstDefined(
    variant.available,
    variant.is_available,
    variant.isAvailable,
    variant.in_stock,
    variant.inStock,
    variant?.metadata?.available,
    variant?.metadata?.is_available,
    variant?.metadata?.isAvailable,
    variant?.metadata?.in_stock,
    variant?.metadata?.inStock,
  ));

  return {
    available: available ?? true,
    quantity: null,
    unlimited_quantity: false,
  };
}

function valueInventory(args: {
  row: ProductRow;
  value: RawOptionValue;
  variants: RawVariant[];
  unlimitedProduct: boolean;
}): InventorySnapshot {
  if (args.unlimitedProduct) {
    return { available: true, quantity: null, unlimited_quantity: true };
  }

  const valueId = text(args.value.id);
  if (valueId && args.variants.length > 0) {
    const relatedVariants = args.variants.filter((variant) => variantValueIds(variant).includes(valueId));
    if (relatedVariants.length > 0) {
      const inventories = relatedVariants.map((variant) => variantInventory(variant, false));
      const unlimited = inventories.some((inventory) => inventory.unlimited_quantity);
      if (unlimited) {
        return { available: true, quantity: null, unlimited_quantity: true };
      }
      const quantity = inventories.reduce(
        (total, inventory) => total + Math.max(0, inventory.quantity ?? 0),
        0,
      );
      return {
        available: quantity > 0 || inventories.some((inventory) => inventory.available && inventory.quantity === null),
        quantity,
        unlimited_quantity: false,
      };
    }
  }

  const unlimited = boolOrNull(firstDefined(
    args.value.unlimited_quantity,
    args.value.unlimitedQuantity,
    args.value?.metadata?.unlimited_quantity,
    args.value?.metadata?.unlimitedQuantity,
  )) === true;

  if (unlimited) {
    return { available: true, quantity: null, unlimited_quantity: true };
  }

  const quantity = numberOrNull(firstDefined(
    args.value.quantity,
    args.value.qty,
    args.value.stock_quantity,
    args.value.stockQuantity,
    args.value.available_qty,
    args.value.availableQty,
    args.value?.metadata?.quantity,
    args.value?.metadata?.qty,
    args.value?.metadata?.stock_quantity,
    args.value?.metadata?.stockQuantity,
  ));

  if (quantity !== null) {
    const normalizedQuantity = Math.max(0, quantity);
    return {
      available: normalizedQuantity > 0,
      quantity: normalizedQuantity,
      unlimited_quantity: false,
    };
  }

  const disabled = boolOrNull(firstDefined(args.value.disabled, args.value?.metadata?.disabled));
  if (disabled === true) {
    return { available: false, quantity: 0, unlimited_quantity: false };
  }

  const available = boolOrNull(firstDefined(
    args.value.available,
    args.value.is_available,
    args.value.isAvailable,
    args.value.in_stock,
    args.value.inStock,
    args.value?.metadata?.available,
    args.value?.metadata?.is_available,
    args.value?.metadata?.isAvailable,
    args.value?.metadata?.in_stock,
    args.value?.metadata?.inStock,
  ));

  return {
    available: available ?? true,
    quantity: null,
    unlimited_quantity: false,
  };
}

export function buildMobileProductOptions(row: ProductRow): MobileProductCard["options"] {
  const variants = productVariantsSource(row);
  const unlimitedProduct = productUnlimited(row);

  return productOptionsSource(row)
    .map((option) => {
      const values = (Array.isArray(option.values) ? option.values : [])
        .map((value: RawOptionValue) => {
          const name = text(value.name) || text(value.label) || text(value.value) || text(value.display_value) || text(value.displayValue);
          const displayValue = text(value.display_value) || text(value.displayValue) || name;
          const color = text(value.color) || text(value.colorHex) || text(value.color_hex) || null;
          const imageUrl = text(value.image_url) || text(value.imageUrl) || text(value.image) || null;

          const inventory = valueInventory({ row, value, variants, unlimitedProduct });

          return {
            id: text(value.id),
            name,
            display_value: displayValue || null,
            image_url: imageUrl,
            color,
            quantity: inventory.quantity,
            unlimited_quantity: inventory.unlimited_quantity,
            available: inventory.available,
          };
        })
        .filter((value) => value.id && (value.name || value.display_value || value.color || value.image_url));

      return {
        id: text(option.id),
        name: text(option.name) || text(option.label) || text(option.title),
        option_field_type: text(option.option_field_type) || text(option.featureType) || text(option.type) || null,
        display_type: text(option.display_type) || text(option.displayType) || text(option.type) || null,
        values,
      };
    })
    .filter((option) => option.id && option.name && option.values.length > 0);
}

export function hasMobileProductVariants(row: ProductRow): boolean {
  return productVariantsSource(row).length > 0 || buildMobileProductOptions(row).length > 0;
}
