// FILE: apps/storefront/src/components/storefront/header.tsx
import Link from "next/link";

import { getSeoUrlMode } from "@/data/store/settings";
import { getCategoriesForGrid } from "@/data/catalog/category";
import { categoryUrl } from "@/lib/seo/urls";

// ✅ Client components
import HeaderAccount from "@/components/storefront/header-account";
import CartIconButton from "@/components/storefront/cart/CartIconButton";

type StoreMini = {
  id: string;
  slug: string;
  name: string;
  logo_url?: string | null;
};

export default async function StoreHeader({ store }: { store: StoreMini }) {
  const mode = await getSeoUrlMode(store.id);

  const cats = await getCategoriesForGrid({
    store_id: store.id,
    parent_id: null,
    limit: 8,
  });

  const isShort = mode === "short";

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-slate-200" />
          <div className="text-sm font-semibold text-slate-900">
            {store.name}
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          <Link
            className="rounded-full px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
            href="/"
          >
            الرئيسية
          </Link>

          {!isShort ? (
            <>
              <Link
                className="rounded-full px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
                href="/products"
              >
                المنتجات
              </Link>

              <Link
                className="rounded-full px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
                href="/categories"
              >
                الأقسام
              </Link>
            </>
          ) : null}

          {cats.map((c) => (
            <Link
              key={c.id}
              className="rounded-full px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
              href={categoryUrl({
                mode,
                name: c.name,
                short_url: c.short_url ?? null,
                public_no: c.public_no ?? null,
                slug_fallback: c.slug,
              })}
            >
              {c.name}
            </Link>
          ))}
        </nav>

        {/* ✅ يمين الهيدر: سلة + حساب */}
        <div className="flex items-center gap-2">
          <CartIconButton />
          <HeaderAccount />
        </div>
      </div>
    </header>
  );
}
