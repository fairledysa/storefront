import { proxyStoreRoute } from "@/app/(store)/api/mobile/v1/_shared/store-route-proxy";
import { mobileOptions } from "@/app/(store)/api/mobile/v1/_shared/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return mobileOptions(request);
}

type Ctx = { params: Promise<{ orderNo: string }> };

async function target(context: Ctx) {
  const { orderNo } = await context.params;
  return `/api/account/orders/${encodeURIComponent(orderNo)}/review`;
}

export async function GET(request: Request, context: Ctx) {
  return proxyStoreRoute(request, await target(context));
}
export async function POST(request: Request, context: Ctx) {
  return proxyStoreRoute(request, await target(context));
}
export async function DELETE(request: Request, context: Ctx) {
  return proxyStoreRoute(request, await target(context));
}
