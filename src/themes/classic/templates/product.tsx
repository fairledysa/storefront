// FILE: apps/storefront/src/themes/classic/templates/product.tsx

import ProductGallery from "@/components/storefront/product/ProductGallery";
import ProductConfigurator from "@/components/storefront/product/ProductConfigurator";

type StoreRow = {
  id: string;
  slug: string;
  name: string;
  logo_url?: string | null;

  // ✅ NEW: عملة المتجر (لو موجودة في ctx/store)
  currency?: string | null;
};

type ProductMediaRow = {
  id?: string;
  media_kind?: "image" | "video" | string;
  original_url?: string | null;
  thumbnail_url?: string | null;
  alt?: string | null;
  video_url?: string | null;
  is_default?: boolean;
  sort_order?: number | null;
};

type ProductOptionValueRow = {
  id: string;
  name: string;
  display_value?: string | null;
  extra_price?: number | null;
  quantity?: number | null;
  is_default?: boolean | null;
  image_url?: string | null;
  sort_order?: number | null;
};

type ProductOptionRow = {
  id: string;
  name: string;
  is_required?: boolean | null;
  option_field_type?: string | null;
  display_type?: "text" | "image" | "color" | string | null;
  sort_order?: number | null;
  values?: ProductOptionValueRow[];
};

type ProductVariantRow = {
  id: string;
  sku?: string | null;
  barcode?: string | null;
  price?: number | null;
  sale_price?: number | null;
  stock_quantity?: number | null;
  unlimited_quantity?: boolean | null;
  is_default?: boolean | null;
  option_value_ids?: string[];
};

type ProductPricingRow = {
  currency?: string | null;
  price?: number | null;
  sale_price?: number | null;
  cost_price?: number | null;
  sale_start?: string | null;
  sale_end?: string | null;
  with_tax?: boolean | null;
  tax_reason_code?: string | null;
} | null;

type ProductStockRow = {
  quantity?: number | null;
  unlimited_quantity?: boolean | null;
  hide_quantity?: boolean | null;
  maximum_quantity_per_order?: number | null;
  notify_low?: number | null;
} | null;

type ProductDetails = {
  id: string;
  name: string;
  description?: string | null;
  short_url?: string | null;
  public_no?: number | null;
  status?: string | null;

  image_url?: string | null;
  thumbnail_url?: string | null;

  seo?: {
    currency?: string | null;
    price?: number | null;
    sale_price?: number | null;
    in_stock?: boolean | null;
    og_image_url?: string | null;
  } | null;

  // ✅ تفاصيل إضافية (جايه من loader)
  media?: ProductMediaRow[];
  options?: ProductOptionRow[];
  variants?: ProductVariantRow[];
  metadata?: Record<string, any> | null;

  // ✅ ADD: loader يرجعها
  pricing?: ProductPricingRow;
  stock?: ProductStockRow;
};

export default async function ClassicProduct({
  store,
  data,
}: {
  store: StoreRow;
  theme: any;
  sections: any[];
  data?: { product: ProductDetails };
}) {
  const product = data?.product;

  if (!product?.id) {
    return (
      <div dir="rtl" className="rounded-2xl border bg-white p-6">
        <div className="text-sm text-slate-600">تعذر تحميل المنتج.</div>
      </div>
    );
  }

  // ✅ يخفي بلوك الميتاداتا في الإنتاج
  const showDebugMeta = process.env.NODE_ENV !== "production";

  // ✅ NEW: عملة افتراضية من المتجر (ثم fallback SAR)
  const currencyFallback = store?.currency || "SAR";

  return (
    <div dir="rtl" className="rounded-2xl border bg-white p-6">
      {/* ====== Gallery (Client) ====== */}
      <ProductGallery
        name={product.name}
        image_url={product.image_url}
        thumbnail_url={product.thumbnail_url}
        media={product.media || []}
      />

      {/* ====== اسم المنتج ====== */}
      <h1 className="text-2xl font-semibold text-slate-900">
        {product?.name || "منتج"}
      </h1>

      {/* ====== Configurator: السعر + التوفر + الخيارات + variant (Client) ====== */}
      <ProductConfigurator
        productId={product.id} // ✅ ADD
        currencyFallback="SAR"
        pricing={product.pricing ?? null}
        stock={product.stock ?? null}
        options={product.options || []}
        variants={product.variants || []}
        seo={product.seo ?? null}
        metadata={product.metadata ?? null}
      />

      {/* ====== الوصف ====== */}
      {product?.description ? (
        <p className="mt-6 text-sm leading-7 text-slate-700">
          {product.description}
        </p>
      ) : (
        <p className="mt-6 text-sm text-slate-500">بدون وصف</p>
      )}

      {/* ====== Debug: metadata (DEV ONLY) ====== */}
      {showDebugMeta &&
      product?.metadata &&
      Object.keys(product.metadata).length ? (
        <div className="mt-8 rounded-2xl border bg-slate-50 p-5">
          <div className="mb-2 text-sm font-semibold text-slate-900">
            معلومات إضافية (DEV)
          </div>
          <pre className="overflow-auto rounded-xl border bg-white p-4 text-xs leading-6 text-slate-700">
            {JSON.stringify(product.metadata, null, 2)}
          </pre>
        </div>
      ) : null}

      {/* ====== معلومات تقنية بسيطة (لا نحذف) ====== */}
      <div className="mt-8 text-xs text-slate-500">
        {product?.public_no ? (
          <span>public_no: {product.public_no}</span>
        ) : null}
        {product?.short_url ? (
          <span className="mr-3">short_url: {product.short_url}</span>
        ) : null}
        {product?.status ? (
          <span className="mr-3">status: {product.status}</span>
        ) : null}
      </div>
    </div>
  );
}
