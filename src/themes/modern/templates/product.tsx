// FILE: apps/storefront/src/themes/modern/templates/product.tsx
import type { ThemeRuntime } from "@/theme-engine/registry";

type StoreRow = { id: string; slug: string; name: string };

export default function ClassicProduct({
  data,
}: {
  store: StoreRow;
  theme: ThemeRuntime;
  sections: any[];
  data?: {
    product: { id: string; name: string; description?: string | null };
  };
}) {
  const product = data?.product;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8" dir="rtl">
      <div className="rounded-2xl border bg-white p-6">
        <h1 className="text-2xl font-semibold">{product?.name || "منتج"}</h1>
        <p className="mt-3 text-sm text-slate-700">
          {product?.description || "بدون وصف"}
        </p>
      </div>
    </main>
  );
}
