// FILE: apps/storefront/src/themes/classic/sections/categories-grid.tsx
import Link from "next/link";
import { getSeoUrlMode } from "@/data/store/settings";
import { categoryUrl } from "@/lib/seo/urls";

export default async function CategoriesGrid({
  store,
  categories,
}: {
  store: { id: string };
  categories: any[];
}) {
  const mode = await getSeoUrlMode(store.id);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {categories.map((c) => (
        <Link
          key={c.id}
          href={categoryUrl({
            mode,
            name: c.name,
            short_url: c.short_url,
            public_no: c.public_no,
            slug_fallback: c.slug,
          })}
          className="rounded-xl bg-white p-4"
        >
          {c.name}
        </Link>
      ))}
    </div>
  );
}
