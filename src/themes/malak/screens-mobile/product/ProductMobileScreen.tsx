// FILE: apps/storefront/src/themes/malak/screens-mobile/product/ProductMobileScreen.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useNavStack } from "../../app-navigation/stack";

import SearchOverlay from "../../app-shell/SearchOverlay";

import MobileProductGallery from "./_components/MobileProductGallery";
import MobileProductInfo from "./_components/MobileProductInfo";
import MobileStickyAddToCart from "./_components/MobileStickyAddToCart";
import MobileProductTabs from "./_components/MobileProductTabs";

type Props = { data?: any };

function safeNum(x: any): number | null {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function readMetaBool(meta: any, keys: string[]) {
  for (const key of keys) {
    const value = meta?.[key];

    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;

    if (typeof value === "string") {
      const v = value.trim().toLowerCase();
      if (v === "true" || v === "1") return true;
      if (v === "false" || v === "0") return false;
    }
  }

  return false;
}

function isSellableVariant(v: any, productUnlimited: boolean) {
  if (productUnlimited) return true;

  const unlimited = Boolean(v?.unlimited_quantity ?? false);
  if (unlimited) return true;

  const qty = Number(v?.stock_quantity ?? 0);
  return Number.isFinite(qty) && qty > 0;
}

function buildDefaultSelectionFromSellable(
  options: any[],
  variants: any[],
  productUnlimited: boolean,
) {
  const sellableVariants = (Array.isArray(variants) ? variants : []).filter(
    (v) => isSellableVariant(v, productUnlimited),
  );

  if (sellableVariants.length > 0) {
    const first =
      sellableVariants.find((v: any) => Boolean(v?.is_default)) ||
      sellableVariants[0];

    const ids = Array.isArray(first?.option_value_ids)
      ? first.option_value_ids.map((id: any) => String(id)).filter(Boolean)
      : [];

    if (ids.length) return ids;
  }

  const out: string[] = [];

  for (const opt of Array.isArray(options) ? options : []) {
    const vals = Array.isArray(opt?.values) ? opt.values : [];
    const def = vals.find((v: any) => Boolean(v?.is_default)) ?? vals[0];

    if (def?.id) out.push(String(def.id));
  }

  return out;
}

function computeAllowedValues(args: {
  options: any[];
  variants: any[];
  selectedIds: string[];
  productUnlimited: boolean;
}) {
  const options = Array.isArray(args.options) ? args.options : [];
  const variants = (Array.isArray(args.variants) ? args.variants : []).filter(
    (v) => isSellableVariant(v, args.productUnlimited),
  );

  const selectedSet = new Set<string>((args.selectedIds || []).map(String));
  const allowedByOption = new Map<string, Set<string>>();

  for (const opt of options) {
    const optId = String(opt?.id ?? "");
    const optValues = Array.isArray(opt?.values) ? opt.values : [];

    const currentIdsOfThisOption = new Set<string>(
      optValues
        .map((v: any) => String(v?.id ?? ""))
        .filter((id: string) => Boolean(id)),
    );

    const allowed = new Set<string>();

    for (const v of optValues) {
      const valueId = String(v?.id ?? "");
      if (!valueId) continue;

      const testSelected = new Set<string>(selectedSet);

      for (const oldId of Array.from(currentIdsOfThisOption)) {
        testSelected.delete(String(oldId));
      }

      testSelected.add(valueId);

      const ok = variants.some((variant: any) => {
        const ids = new Set<string>(
          (Array.isArray(variant?.option_value_ids)
            ? variant.option_value_ids
            : []
          )
            .map((id: any) => String(id))
            .filter((id: string) => Boolean(id)),
        );

        for (const selectedId of testSelected) {
          if (!ids.has(selectedId)) return false;
        }

        return true;
      });

      if (ok) allowed.add(valueId);
    }

    allowedByOption.set(optId, allowed);
  }

  return allowedByOption;
}

function resolveSelectedVariant(
  variants: any[],
  selectedIds: string[],
  productUnlimited: boolean,
) {
  const clean = (selectedIds || []).map(String).filter(Boolean);
  if (!clean.length) return null;

  const sellableVariants = (Array.isArray(variants) ? variants : []).filter(
    (v) => isSellableVariant(v, productUnlimited),
  );

  return (
    sellableVariants.find((v: any) => {
      const ids = Array.isArray(v?.option_value_ids)
        ? v.option_value_ids.map((id: any) => String(id)).filter(Boolean)
        : [];

      if (ids.length !== clean.length) return false;

      for (const id of ids) {
        if (!clean.includes(id)) return false;
      }

      return true;
    }) ?? null
  );
}

export default function ProductMobileScreen({ data }: Props) {
  const router = useRouter();

  const pushStack = useNavStack((s) => s.push);
  const setCurrent = useNavStack((s) => s.setCurrent);

  const [searchOpen, setSearchOpen] = useState(false);

  const product = data?.product ?? null;

  useEffect(() => {
    setCurrent("product");
  }, [setCurrent]);

  const images: string[] = useMemo(() => {
    const media = Array.isArray(product?.media) ? product.media : [];

    const list = media
      .filter((m: any) => m?.media_kind === "image" && m?.original_url)
      .sort(
        (a: any, b: any) =>
          Number(a?.sort_order ?? 0) - Number(b?.sort_order ?? 0),
      )
      .map((m: any) => String(m.original_url));

    if (list.length) return list;

    const img = String(product?.image_url ?? "").trim();
    return img ? [img] : [];
  }, [product?.media, product?.image_url]);

  const options = useMemo(
    () => (Array.isArray(product?.options) ? product.options : []),
    [product?.options],
  );

  const variants = useMemo(
    () => (Array.isArray(product?.variants) ? product.variants : []),
    [product?.variants],
  );

  const productUnlimited = Boolean(product?.stock?.unlimited_quantity ?? false);
  const productQty = Number(product?.stock?.quantity ?? 0);

  const hasSimpleProductStock =
    productUnlimited || (Number.isFinite(productQty) && productQty > 0);

  const hasOptions = options.length > 0;
  const hasVariants = variants.length > 0;
  const isVariantProduct = hasOptions && hasVariants;

  const defaultSelectedIds = useMemo(() => {
    if (!isVariantProduct) return [];

    return buildDefaultSelectionFromSellable(
      options,
      variants,
      productUnlimited,
    );
  }, [isVariantProduct, options, variants, productUnlimited]);

  const [selectedOptionValueIds, setSelectedOptionValueIds] =
    useState<string[]>([]);

  useEffect(() => {
    setSelectedOptionValueIds(defaultSelectedIds);
  }, [defaultSelectedIds]);

  const allowedByOption = useMemo(() => {
    if (!isVariantProduct) return new Map<string, Set<string>>();

    return computeAllowedValues({
      options,
      variants,
      selectedIds: selectedOptionValueIds,
      productUnlimited,
    });
  }, [
    isVariantProduct,
    options,
    variants,
    selectedOptionValueIds,
    productUnlimited,
  ]);

  const selectedVariant = useMemo(() => {
    if (!isVariantProduct) return null;

    return resolveSelectedVariant(
      variants,
      selectedOptionValueIds,
      productUnlimited,
    );
  }, [isVariantProduct, variants, selectedOptionValueIds, productUnlimited]);

  const basePrice =
    safeNum(selectedVariant?.price) ??
    safeNum(product?.pricing?.price) ??
    safeNum(product?.seo?.price) ??
    safeNum(product?.price) ??
    0;

  const salePrice =
    safeNum(selectedVariant?.sale_price) ??
    safeNum(product?.pricing?.sale_price) ??
    safeNum(product?.seo?.sale_price) ??
    safeNum(product?.sale_price) ??
    0;

  const hasDiscount = salePrice > 0 && salePrice < basePrice;
  const finalPrice = hasDiscount ? salePrice : basePrice;
  const compareAtPrice = hasDiscount ? basePrice : null;

  const selectedOptionsSnapshot = useMemo(() => {
    const selectedSet = new Set(selectedOptionValueIds.map(String));
    const out: Array<{ name: string; value: string }> = [];

    for (const opt of options) {
      const optName = String(opt?.name ?? "").trim();
      if (!optName) continue;

      const vals = Array.isArray(opt?.values) ? opt.values : [];
      const hit = vals.find((v: any) => selectedSet.has(String(v?.id)));
      if (!hit) continue;

      const valName = String(hit?.display_value ?? hit?.name ?? "").trim();
      if (!valName) continue;

      out.push({ name: optName, value: valName });
    }

    return out;
  }, [options, selectedOptionValueIds]);

  const canAddToCart = isVariantProduct
    ? Boolean(selectedVariant?.id)
    : hasSimpleProductStock;

  const allowFileUpload = readMetaBool(product?.metadata, [
    "enableUploadImage",
    "allow_file_upload",
    "enable_file_upload",
    "attachment_enabled",
    "allow_attachment",
    "file_upload_enabled",
  ]);

  const allowNote = readMetaBool(product?.metadata, [
    "enableNote",
    "allow_note",
    "enable_note",
    "note_enabled",
    "customer_note_enabled",
    "allow_customer_note",
  ]);

  const saleEnd =
    String(product?.pricing?.sale_end ?? product?.sale_end ?? "").trim() ||
    null;

  const showSaleCountdown = readMetaBool(product?.metadata, [
    "showSaleCountdown",
    "show_sale_countdown",
  ]);

  function handleBack() {
    setCurrent("product");

    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }

  function handleOpenCart() {
    pushStack("cart");
    router.push("/cart");
  }

  if (!product) {
    return (
      <div dir="rtl" className="mk-mobile-product__error">
        تعذر تحميل المنتج
      </div>
    );
  }

  return (
    <>
      <div dir="rtl" className="mk-mobile-product">
        <div className="mk-mobile-product__body">
          <MobileProductGallery
            images={images}
            title={String(product?.name ?? "")}
            promotionTitle={
              product?.metadata?.promotionTitle ??
              product?.promotionTitle ??
              null
            }
            onBack={handleBack}
            onSearch={() => setSearchOpen(true)}
            onOpenCart={handleOpenCart}
          />

          <MobileProductInfo
            name={String(product?.name ?? "")}
            subtitle={product?.metadata?.subtitle ?? null}
            promotionTitle={
              product?.metadata?.promotionTitle ??
              product?.promotionTitle ??
              null
            }
            brand={product?.metadata?.brand ?? product?.brand?.name ?? null}
            price={finalPrice}
            compareAtPrice={compareAtPrice}
            saleEnd={saleEnd}
            showSaleCountdown={showSaleCountdown}
            options={isVariantProduct ? options : []}
            selectedOptionValueIds={
              isVariantProduct ? selectedOptionValueIds : []
            }
            allowedByOption={allowedByOption}
            onSelectOption={(optionId, valueId) => {
              if (!isVariantProduct) return;

              const allowed = allowedByOption.get(String(optionId));
              if (allowed && !allowed.has(String(valueId))) return;

              setSelectedOptionValueIds((prev) => {
                const opt = options.find(
                  (o: any) => String(o?.id) === String(optionId),
                );

                const optValueIds = (Array.isArray(opt?.values)
                  ? opt.values
                  : []
                )
                  .map((v: any) => String(v?.id))
                  .filter(Boolean);

                const filtered = prev.filter(
                  (id) => !optValueIds.includes(String(id)),
                );

                return [...filtered, String(valueId)];
              });
            }}
          />

          {!canAddToCart ? (
            <div className="mk-mobile-product__stockAlertWrap">
              <div className="mk-mobile-product__stockAlert">
                {isVariantProduct
                  ? "هذه التركيبة غير متوفرة أو نفدت الكمية."
                  : "هذا المنتج غير متوفر حالياً."}
              </div>
            </div>
          ) : null}

          <MobileProductTabs
            productId={String(product?.id ?? "")}
            reviewsEnabled={true}
            questionsEnabled={true}
            allowGuestQuestions={false}
            descriptionHtml={String(product?.metadata?.descriptionHtml ?? "")}
            descriptionText={String(product?.description ?? "")}
            specsHtml={String(product?.metadata?.specsHtml ?? "")}
            reviewsCount={Number(product?.rating?.count ?? 0)}
            showSeeMoreButton={true}
          />
        </div>

        <MobileStickyAddToCart
          productId={String(product?.id ?? "")}
          variantId={
            isVariantProduct
              ? selectedVariant?.id
                ? String(selectedVariant.id)
                : null
              : null
          }
          price={finalPrice}
          compareAtPrice={compareAtPrice}
          selectedOptionValueIds={isVariantProduct ? selectedOptionValueIds : []}
          selectedOptions={selectedOptionsSnapshot}
          disabled={!canAddToCart}
          allowFileUpload={allowFileUpload}
          allowNote={allowNote}
          onOpenCart={handleOpenCart}
        />
      </div>

      <SearchOverlay open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}