import {
  DELETE as removeCoupon,
  POST as applyCoupon,
} from "@/app/(store)/api/cart/coupon/route";
import {
  mobileOptions,
  withMobileCors,
} from "@/app/(store)/api/mobile/v1/_shared/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(request: Request) {
  return mobileOptions(request);
}

export async function POST(request: Request) {
  return withMobileCors(request, await applyCoupon(request));
}

export async function DELETE(request: Request) {
  return withMobileCors(request, await removeCoupon(request));
}
