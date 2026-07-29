import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getStoreDb } from "@/data/db/store-db.server";
import { verifySession } from "@/lib/auth/session";
import { storeCustomerExists } from "@/lib/auth/store-customer.server";
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
 if(!(await storeCustomerExists(db,storeId,customerId))) return {error:json({ok:false,error:"UNAUTHENTICATED"},401)} as const;
 return {storeId,customerId,db,currency:text(store?.store?.default_currency||"SAR").toUpperCase()} as const;
}
function idem(prefix:string){ return `${prefix}:${crypto.randomUUID()}`; }

export async function GET(){ try{ const c=await context(); if("error" in c)return c.error; const r=await c.db.from("store_wallet_settings").select("wallet_enabled,topup_enabled,checkout_enabled,partial_payment_enabled,withdrawal_enabled,gifting_enabled,minimum_topup_amount,maximum_topup_amount,minimum_withdrawal_amount,maximum_withdrawal_amount,withdrawal_fee_type,withdrawal_fee_value,withdrawal_processing_days").eq("store_id",c.storeId).maybeSingle(); if(r.error)throw r.error; return json({ok:true,settings:r.data??{wallet_enabled:true,topup_enabled:false,checkout_enabled:true,partial_payment_enabled:true,withdrawal_enabled:false,gifting_enabled:false}}); }catch(e){console.error("[wallet/settings]",e);return json({ok:false,error:"WALLET_SETTINGS_LOAD_FAILED"},500)} }
