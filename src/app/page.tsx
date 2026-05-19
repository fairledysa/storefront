// apps/storefront/src/app/page.tsx
import type { Metadata } from "next";
import { headers } from "next/headers";

import PlatformHome from "./platform/page";
import StoreHomePage from "./(store)/page";

// ✅ NEW: خذ ميتا المتجر من المصدر الصحيح (route)
import { generateMetadata as generateStoreMetadata } from "./(store)/page";

/* ---------------------------------- */
/* helpers                            */
/* ---------------------------------- */
function cleanHost(raw: string) {
  return String(raw || "")
    .toLowerCase()
    .replace(/:\d+$/, "");
}

function isLocalRoot(host: string) {
  return host === "localhost" || host === "127.0.0.1";
}

/* ---------------------------------- */
/* META – المصدر النهائي              */
/* ---------------------------------- */
export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const host = cleanHost(h.get("host") || "");

  // منصة (localhost)
  if (isLocalRoot(host)) {
    return {
      title: "منصة elyaia",
      description: "منصة تجارة إلكترونية",
    };
  }

  // ✅ متجر: رجّع ميتا المتجر الفعلية (عشان تطلع في head)
  return await generateStoreMetadata();
}

/* ---------------------------------- */
/* PAGE                               */
/* ---------------------------------- */
export default async function RootPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const h = await headers();
  const host = cleanHost(h.get("host") || "");

  // منصة
  if (isLocalRoot(host)) {
    return <PlatformHome />;
  }

  // متجر
  return <StoreHomePage searchParams={searchParams} />;
}
