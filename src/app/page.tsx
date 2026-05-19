// apps/storefront/src/app/page.tsx
import type { Metadata } from "next";
import { headers } from "next/headers";

import PlatformHome from "./platform/page";
import StoreHomePage from "./(store)/page";
import { generateMetadata as generateStoreMetadata } from "./(store)/page";

/* ---------------------------------- */
/* helpers                            */
/* ---------------------------------- */

function cleanHost(raw: string) {
  return String(raw || "")
    .toLowerCase()
    .replace(/:\d+$/, "");
}

function getRootDomain() {
  return (
    process.env.ROOT_DOMAIN ||
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ||
    "elyaia.com"
  )
    .toLowerCase()
    .trim();
}

function isPlatformHost(host: string) {
  const root = getRootDomain();

  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === root ||
    host === `www.${root}`
  );
}

/* ---------------------------------- */
/* META                               */
/* ---------------------------------- */

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const host = cleanHost(h.get("host") || "");

  if (isPlatformHost(host)) {
    return {
      title: "منصة elyaia",
      description: "منصة تجارة إلكترونية",
    };
  }

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

  if (isPlatformHost(host)) {
    return <PlatformHome />;
  }

  return <StoreHomePage searchParams={searchParams} />;
}