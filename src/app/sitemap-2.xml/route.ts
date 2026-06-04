// FILE: apps/storefront/src/app/sitemap-2.xml/route.ts

import type { NextRequest } from "next/server";
import { handleSitemapTwo } from "@/app/_seo/storefront-seo-files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleSitemapTwo(request);
}