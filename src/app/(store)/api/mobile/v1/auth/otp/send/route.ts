import { POST as sendOtp } from "@/app/(store)/api/auth/otp/send/route";
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
  return withMobileCors(request, await sendOtp(request));
}
