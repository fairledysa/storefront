import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getStoreDb } from "@/data/db/store-db.server";
import { verifySession } from "@/lib/auth/session";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";

export const dynamic = "force-dynamic";
const HEADERS = { "Cache-Control": "no-store" };
function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: HEADERS }); }
function text(v: unknown) { return String(v ?? "").trim(); }
function num(v: unknown) { const n=Number(v); return Number.isFinite(n)?n:0; }
async function context() {
 const store=await resolveStoreContext(); const storeId=text(store?.store?.id);
 if(!storeId) return {error:json({ok:false,error:"STORE_NOT_FOUND"},404)} as const;
 const token=(await cookies()).get("elyaia_session")?.value || (await cookies()).get("elyaiaSession")?.value || "";
 if(!token) return {error:json({ok:false,error:"UNAUTHENTICATED"},401)} as const;
 let session:any=null; try{session=await Promise.resolve(verifySession(token) as any)}catch{}
 const db:any=await getStoreDb(storeId);
 let customerId=text(session?.customer_id);
 if(!customerId && (session?.auth_user_id||session?.user_id)){ const r=await db.from("customers").select("id").eq("auth_user_id",text(session.auth_user_id||session.user_id)).maybeSingle(); customerId=text(r.data?.id); }
 if(!customerId) return {error:json({ok:false,error:"UNAUTHENTICATED"},401)} as const;
 return {storeId,customerId,db,currency:text(store?.store?.default_currency||"SAR").toUpperCase()} as const;
}
function idem(prefix:string){ return `${prefix}:${crypto.randomUUID()}`; }

export async function POST(req:NextRequest){ try{ const c=await context(); if("error" in c)return c.error; const b=await req.json().catch(()=>({})); const amount=num(b.amount); if(amount<=0)return json({ok:false,error:"INVALID_TOPUP_AMOUNT"},400); const publishable=text(process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY); const secret=text(process.env.MOYASAR_SECRET_KEY); if(!publishable||!secret)return json({ok:false,error:"MOYASAR_NOT_CONFIGURED",message_ar:"إضافة الرصيد ستتوفر بعد ربط حساب ميسر."},503); const r=await c.db.rpc("wallet_create_topup_session",{p_store_id:c.storeId,p_customer_id:c.customerId,p_amount:amount,p_currency:text(b.currency||c.currency),p_payment_method:"card",p_payment_provider:"moyasar",p_idempotency_key:text(b.idempotency_key)||idem("topup"),p_expires_at:null,p_metadata:{source:"storefront_customer_wallet"}}); if(r.error)throw r.error; return json({ok:true,session:r.data,publishable_key:publishable}); }catch(e:any){console.error("[wallet/topup]",e);return json({ok:false,error:text(e?.message)||"TOPUP_CREATE_FAILED"},400)} }
