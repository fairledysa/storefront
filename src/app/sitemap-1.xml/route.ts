// FILE: apps/storefront/src/app/sitemap-1.xml/route.ts

import type { NextRequest } from "next/server";
import { handleSitemapOne } from "@/app/_seo/storefront-seo-files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleSitemapOne(request);
}