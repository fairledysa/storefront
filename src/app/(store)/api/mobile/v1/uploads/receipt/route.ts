import {
  mobileOptions,
  withMobileCors,
} from "@/app/(store)/api/mobile/v1/_shared/cors";
import { handleStoreImageUpload } from "@/app/(store)/api/uploads/r2/put/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return mobileOptions(request);
}

export async function POST(request: Request) {
  return withMobileCors(
    request,
    await handleStoreImageUpload(request, {
      allowedKinds: new Set([
        "bank-transfer-receipt",
        "review-media",
      ]),
      requireCustomer: true,
    }),
  );
}
