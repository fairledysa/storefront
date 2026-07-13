import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getStoreDb } from "@/data/db/store-db.server";
import { verifySession } from "@/lib/auth/session";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { createTicketMerchantNotification } from "@/lib/support/create-ticket-merchant-notification.server";

export const dynamic = "force-dynamic";
const headers={"Cache-Control":"no-store"};
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers});

async function context(){
 const store=await resolveStoreContext(); const storeId=String(store?.store?.id||"");
 const token=(await cookies()).get("elyaia_session")?.value;
 if(!storeId) throw new Error("STORE_NOT_FOUND"); if(!token) throw new Error("UNAUTHENTICATED");
 const session=await verifySession(token); const customerId=String(session?.customer_id||"");
 if(!customerId) throw new Error("UNAUTHENTICATED"); return {storeId,customerId,store};
}
function statusFor(e:unknown){const m=String((e as any)?.message||e);return m.includes("UNAUTHENTICATED")?401:m.includes("STORE_NOT_FOUND")?404:400;}

export async function GET(){try{const {storeId,customerId}=await context();const db:any=await getStoreDb(storeId);
 const result=await db.from("support_tickets").select("id,public_no,subject,category,status,priority,customer_unread_count,last_message_at,created_at,updated_at").eq("store_id",storeId).eq("customer_id",customerId).order("last_message_at",{ascending:false}); if(result.error)throw result.error;
 const tickets=result.data||[]; const counts={all:tickets.length,open:0,in_progress:0,waiting:0,closed:0}; for(const t of tickets){if(t.status==='open')counts.open++;else if(t.status==='in_progress')counts.in_progress++;else if(t.status==='waiting_customer'||t.status==='waiting_support')counts.waiting++;else if(t.status==='resolved'||t.status==='closed')counts.closed++;}
 return json({ok:true,tickets,counts});}catch(e){return json({ok:false,error:String((e as any)?.message||e)},statusFor(e));}}

export async function POST(req:NextRequest){try{const {storeId,customerId,store}=await context();const body=await req.json().catch(()=>({}));
 const subject=String(body.subject||"").trim(), message=String(body.message||"").trim(), category=String(body.category||"general"), requestId=String(body.client_request_id||crypto.randomUUID());
 if(subject.length<3||message.length<1)return json({ok:false,error:"INVALID_TICKET"},400);
 const attachments=Array.isArray(body.attachments)?body.attachments.slice(0,5):[]; const db:any=await getStoreDb(storeId);
 const rpc=await db.rpc("support_create_ticket",{p_store_id:storeId,p_customer_id:customerId,p_subject:subject,p_category:category,p_body:message,p_order_id:body.order_id||null,p_client_request_id:requestId,p_attachments:attachments}); if(rpc.error)throw rpc.error;
 const customer=await db.from("customers").select("email,full_name").eq("id",customerId).maybeSingle();
 await createTicketMerchantNotification({
   storeId,
   ticketId:String(rpc.data?.ticket_id||rpc.data?.id||""),
   publicNo:rpc.data?.public_no,
   subject,
   kind:"ticket_created",
   customerName:String(customer.data?.full_name||""),
   messagePreview:message,
 }).catch(()=>{});
 const email=String(customer.data?.email||"").trim(); if(email&&process.env.RESEND_API_KEY&&(process.env.RESEND_FROM_EMAIL||process.env.EMAIL_FROM)){fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({from:process.env.RESEND_FROM_EMAIL||process.env.EMAIL_FROM,to:[email],subject:`تم استلام تذكرتك #TK-${rpc.data.public_no}`,html:`<div dir="rtl" style="font-family:Arial"><h2>تم استلام تذكرتك</h2><p>${subject}</p><p>رقم التذكرة: <b>#TK-${rpc.data.public_no}</b></p><p>سنرسل لك إشعارًا عند وصول رد جديد.</p></div>`})}).catch(()=>{});}
 return json({ok:true,...rpc.data},201);}catch(e){return json({ok:false,error:String((e as any)?.message||e)},statusFor(e));}}
