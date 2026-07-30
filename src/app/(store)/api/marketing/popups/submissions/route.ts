import { NextRequest, NextResponse } from "next/server";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { getStoreDb } from "@/data/db/store-db.server";
export const dynamic="force-dynamic";
const s=(v:unknown)=>String(v??"").trim();
export async function POST(request:NextRequest){try{const context=await resolveStoreContext(),storeId=context.store?.id;if(!storeId)return NextResponse.json({ok:false},{status:404});const body=await request.json().catch(()=>({})),popupId=s(body.popupId);if(!popupId)return NextResponse.json({ok:false},{status:400});const db:any=await getStoreDb(storeId);const{error}=await db.from("marketing_popup_submissions").insert({store_id:storeId,popup_id:popupId,submission_type:s(body.submissionType)||"form",session_id:s(body.sessionId)||null,page_type:s(body.pageType)||null,page_reference_id:s(body.pageReferenceId)||null,device_type:s(body.deviceType)||null,payload:body.payload&&typeof body.payload==="object"?body.payload:{}});if(error)throw error;return NextResponse.json({ok:true})}catch(error){console.error("[marketing-popups] submission failed",error);return NextResponse.json({ok:false},{status:200})}}
