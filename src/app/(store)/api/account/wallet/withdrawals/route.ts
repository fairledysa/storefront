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
function operationKey(value:unknown,prefix:string){const key=text(value);return /^[A-Za-z0-9:_-]{16,180}$/.test(key)?key:idem(prefix)}

export async function GET(){ try{ const c=await context(); if("error" in c)return c.error; const r=await c.db.from("customer_wallet_withdrawal_requests").select("id,amount,fee_amount,net_amount,currency,status,bank_name,account_holder_name,iban,customer_note,review_note,rejection_reason,transfer_reference,requested_at,reviewed_at,approved_at,paid_at,rejected_at,cancelled_at,failed_at").eq("store_id",c.storeId).eq("customer_id",c.customerId).order("requested_at",{ascending:false}).limit(100); if(r.error)throw r.error; return json({ok:true,items:r.data??[]}); }catch(e){console.error("[wallet/withdrawals]",e);return json({ok:false,error:"WITHDRAWALS_LOAD_FAILED"},500)} }

export async function POST(req:NextRequest){
 try{
  const c=await context(); if("error" in c)return c.error;
  const body=await req.json().catch(()=>({}));
  const amount=Math.round(num(body.amount)*100)/100;
  const bankName=text(body.bank_name);
  const accountHolder=text(body.account_holder_name);
  const iban=text(body.iban).replace(/\s+/g,"").toUpperCase();
  const validIban=/^[A-Z]{2}[0-9A-Z]{13,32}$/.test(iban);
  if(amount<=0||!bankName||bankName.length>100||!accountHolder||accountHolder.length>120||!validIban){
   return json({ok:false,error:"INVALID_WITHDRAWAL_DATA"},400);
  }
  const settings=await c.db
   .from("store_wallet_settings")
   .select("withdrawal_enabled,minimum_withdrawal_amount,maximum_withdrawal_amount")
   .eq("store_id",c.storeId)
   .maybeSingle();
  if(settings.error)throw settings.error;
  if(!settings.data?.withdrawal_enabled)return json({ok:false,error:"WALLET_WITHDRAWAL_DISABLED"},409);
  const minimum=Math.max(0,num(settings.data.minimum_withdrawal_amount));
  const maximum=settings.data.maximum_withdrawal_amount==null?null:Math.max(0,num(settings.data.maximum_withdrawal_amount));
  if(minimum>0&&amount<minimum)return json({ok:false,error:"WITHDRAWAL_AMOUNT_BELOW_MINIMUM",minimum},400);
  if(maximum!=null&&maximum>0&&amount>maximum)return json({ok:false,error:"WITHDRAWAL_AMOUNT_ABOVE_MAXIMUM",maximum},400);
  const r=await c.db.rpc("wallet_create_withdrawal_request",{
   p_store_id:c.storeId,
   p_customer_id:c.customerId,
   p_amount:amount,
   p_currency:c.currency,
   p_bank_name:bankName,
   p_account_holder_name:accountHolder,
   p_iban:iban,
   p_customer_note:text(body.customer_note).slice(0,500)||null,
   p_idempotency_key:operationKey(body.idempotency_key,"withdrawal"),
   p_metadata:{source:"storefront_customer_wallet"}
  });
  if(r.error)throw r.error;
  return json(r.data,201);
 }catch(e:any){
  console.error("[wallet/withdrawals]",e);
  return json({ok:false,error:"WITHDRAWAL_CREATE_FAILED"},400);
 }
}

export async function PATCH(req:NextRequest){
 try{
  const c=await context(); if("error" in c)return c.error;
  const body=await req.json().catch(()=>({}));
  const id=text(body.id); const action=text(body.action).toLowerCase();
  if(!id||action!=="cancel")return json({ok:false,error:"INVALID_REQUEST"},400);
  const existing=await c.db.from("customer_wallet_withdrawal_requests").select("id,status").eq("id",id).eq("store_id",c.storeId).eq("customer_id",c.customerId).maybeSingle();
  if(existing.error)throw existing.error;
  if(!existing.data?.id)return json({ok:false,error:"WITHDRAWAL_REQUEST_NOT_FOUND"},404);
  if(existing.data.status!=="pending")return json({ok:false,error:"WITHDRAWAL_CANNOT_BE_CANCELLED"},409);
  const r=await c.db.rpc("wallet_process_withdrawal_request",{p_request_id:id,p_action:"cancel",p_store_user_id:null,p_review_note:null,p_rejection_reason:null,p_transfer_reference:null,p_idempotency_key:operationKey(body.idempotency_key,"withdrawal-cancel"),p_metadata:{source:"storefront_customer_wallet"}});
  if(r.error)throw r.error; return json(r.data);
 }catch(e:any){console.error("[wallet/withdrawals/cancel]",e);return json({ok:false,error:"WITHDRAWAL_CANCEL_FAILED"},400)}
}
