import {
  DELETE as deleteAddress,
  GET as getAddresses,
  PATCH as updateAddress,
  POST as createAddress,
} from "@/app/(store)/api/checkout/addresses/route";
import {
  mobileOptions,
  withMobileCors,
} from "@/app/(store)/api/mobile/v1/_shared/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(request: Request) {
  return mobileOptions(request);
}

export async function GET(request: Request) {
  return withMobileCors(request, await getAddresses(request));
}

export async function POST(request: Request) {
  return withMobileCors(request, await createAddress(request));
}

export async function PATCH(request: Request) {
  return withMobileCors(request, await updateAddress(request));
}

export async function DELETE(request: Request) {
  return withMobileCors(request, await deleteAddress(request));
}
