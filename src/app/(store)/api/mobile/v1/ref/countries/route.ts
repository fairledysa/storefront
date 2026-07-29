import { GET as getCountries } from "@/app/(store)/api/ref/countries/route";
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
  return withMobileCors(request, await getCountries(request));
}
