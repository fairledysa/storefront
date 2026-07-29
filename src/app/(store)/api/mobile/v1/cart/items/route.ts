import {
  DELETE as deleteCartItem,
  PATCH as patchCartItem,
  POST as postCartItem,
} from "@/app/(store)/api/cart/items/route";
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
  return withMobileCors(request, await postCartItem(request));
}

export async function PATCH(request: Request) {
  return withMobileCors(request, await patchCartItem(request));
}

export async function DELETE(request: Request) {
  return withMobileCors(request, await deleteCartItem(request));
}
