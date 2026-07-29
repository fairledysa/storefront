import { proxyStoreRoute } from "@/app/(store)/api/mobile/v1/_shared/store-route-proxy";
import { mobileOptions } from "@/app/(store)/api/mobile/v1/_shared/cors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return mobileOptions(request);
}
type Ctx = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Ctx) {
  const { id } = await context.params;
  return proxyStoreRoute(request, `/api/account/tickets/${encodeURIComponent(id)}`);
}
