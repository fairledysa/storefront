import { proxyStoreRoute } from "@/app/(store)/api/mobile/v1/_shared/store-route-proxy";
import { mobileOptions } from "@/app/(store)/api/mobile/v1/_shared/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return mobileOptions(request);
}

type Ctx = { params: Promise<{ orderNo: string }> };

export async function GET(request: Request, context: Ctx) {
  const { orderNo } = await context.params;
  return proxyStoreRoute(
    request,
    `/api/account/orders/${encodeURIComponent(orderNo)}`,
  );
}
