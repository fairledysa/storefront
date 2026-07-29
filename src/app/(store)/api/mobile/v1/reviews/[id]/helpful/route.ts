import { NextResponse } from "next/server";
import { getStoreDb } from "@/data/db/store-db.server";
import { BootstrapError } from "@/data/mobile/bootstrap/bootstrap.errors";
import { readMobileRequestContext } from "@/data/mobile/request-context";
import { resolveActiveMobileStoreApp } from "@/data/mobile/store-app.server";

export const dynamic = "force-dynamic";
const corsHeaders = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"POST,OPTIONS","Access-Control-Allow-Headers":"Accept, Content-Type, Authorization, X-Store-App-Id, X-App-Version, X-App-Environment, X-Platform, Accept-Language, X-Timezone, X-Currency-Code, X-Request-Id"};
export async function OPTIONS(){return new Response(null,{status:204,headers:corsHeaders});}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  let requestId = request.headers.get("x-request-id") || "unknown";
  try {
    const mobileContext = readMobileRequestContext(request);
    requestId = mobileContext.requestId;
    const app = await resolveActiveMobileStoreApp(mobileContext.publicAppId);
    const { id: reviewId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const sessionId = String(body?.session_id ?? "").trim();
    if (!sessionId) return NextResponse.json({error:{code:"SESSION_ID_REQUIRED",message:"Session id is required.",requestId}},{status:400,headers:corsHeaders});
    const db:any = await getStoreDb(app.storeId);
    const review = await db.from("review_entries").select("id,helpful_count").eq("id",reviewId).eq("store_id",app.storeId).eq("status","published").maybeSingle();
    if (review.error) throw review.error;
    if (!review.data) return NextResponse.json({error:{code:"REVIEW_NOT_FOUND",message:"Review not found.",requestId}},{status:404,headers:corsHeaders});
    const existing = await db.from("review_reactions").select("id").eq("review_id",reviewId).eq("session_id",sessionId).eq("reaction_type","helpful").maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) return NextResponse.json({ok:true,reacted:true,helpful_count:Math.max(0,Number(review.data.helpful_count ?? 0))},{headers:{...corsHeaders,"Cache-Control":"private, no-store"}});
    const insert = await db.from("review_reactions").insert({review_id:reviewId,session_id:sessionId,reaction_type:"helpful"});
    if (insert.error) throw insert.error;
    const nextCount = Math.max(0,Number(review.data.helpful_count ?? 0)) + 1;
    const update = await db.from("review_entries").update({helpful_count:nextCount,updated_at:new Date().toISOString()}).eq("id",reviewId).eq("store_id",app.storeId);
    if (update.error) throw update.error;
    return NextResponse.json({ok:true,reacted:true,helpful_count:nextCount},{headers:{...corsHeaders,"Cache-Control":"private, no-store","X-Request-Id":requestId}});
  } catch (error) {
    if (error instanceof BootstrapError || (error && typeof error === "object" && "status" in error)) {
      const value = error as BootstrapError & {status:number;code:string;publicMessage?:string};
      return NextResponse.json({error:{code:value.code,message:value.publicMessage ?? "Invalid mobile request.",requestId}},{status:value.status,headers:corsHeaders});
    }
    console.error("mobile review helpful failed", error);
    return NextResponse.json({error:{code:"MOBILE_REVIEW_HELPFUL_FAILED",message:"Unable to update helpful reaction.",requestId}},{status:500,headers:corsHeaders});
  }
}
