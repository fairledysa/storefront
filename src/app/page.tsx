// FILE: apps/storefront/src/app/page.tsx

import type { Metadata } from "next";
import { headers } from "next/headers";

import PlatformLayout from "./platform/layout";
import PlatformHome from "./platform/page";
import StoreHomePage from "./(store)/page";
import { generateMetadata as generateStoreMetadata } from "./(store)/page";

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

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const host = cleanHost(h.get("host") || "");

  if (isPlatformHost(host)) {
    return {
      title: "إيلايا | منصة تجارة إلكترونية ذكية",
      description:
        "إيلايا منصة تجارة إلكترونية ذكية تساعدك على بناء متجرك وإدارته وتنمية أعمالك من مكان واحد.",
    };
  }

  return await generateStoreMetadata();
}

export default async function RootPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const h = await headers();
  const host = cleanHost(h.get("host") || "");

  if (isPlatformHost(host)) {
    return (
      <PlatformLayout>
        <PlatformHome />
      </PlatformLayout>
    );
  }

  return <StoreHomePage searchParams={searchParams} />;
}