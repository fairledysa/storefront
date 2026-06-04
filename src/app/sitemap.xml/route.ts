// FILE: apps/storefront/src/app/sitemap.xml/route.ts

import type { NextRequest } from "next/server";
import { handleSitemapIndex } from "@/app/_seo/storefront-seo-files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleSitemapIndex(request);
}