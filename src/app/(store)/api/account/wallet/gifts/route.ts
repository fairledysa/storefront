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

export async function POST(req:NextRequest){ try{ const c=await context(); if("error" in c)return c.error; const b=await req.json().catch(()=>({})); const recipient=text(b.recipient); const amount=num(b.amount); if(!recipient||amount<=0)return json({ok:false,error:"INVALID_GIFT_DATA"},400); const settings=await c.db.from("store_wallet_settings").select("gifting_enabled").eq("store_id",c.storeId).maybeSingle(); if(settings.error)throw settings.error; if(!settings.data?.gifting_enabled)return json({ok:false,error:"WALLET_GIFTING_DISABLED"},409); const cr=await c.db.from("customers").select("id").or(`email.eq.${recipient},phone_e164.eq.${recipient}`).limit(1).maybeSingle(); if(cr.error)throw cr.error; const recipientId=text(cr.data?.id); if(!recipientId)return json({ok:false,error:"RECIPIENT_NOT_FOUND"},404); const r=await c.db.rpc("wallet_transfer_gift",{p_store_id:c.storeId,p_sender_customer_id:c.customerId,p_recipient_customer_id:recipientId,p_amount:amount,p_currency:text(b.currency||c.currency),p_message:text(b.message)||null,p_idempotency_key:text(b.idempotency_key)||idem("gift"),p_metadata:{source:"storefront_customer_wallet"}}); if(r.error)throw r.error; return json(r.data,201); }catch(e:any){console.error("[wallet/gifts]",e);return json({ok:false,error:text(e?.message)||"GIFT_SEND_FAILED"},400)} }
