"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { resolvePopupContext } from "./context";
import PopupRenderer from "./renderers/PopupRenderers";
import type { MarketingPopup, PopupCart, PopupDevice, PopupProduct } from "./types";

type Props = { data?: any; device: PopupDevice };
const text = (v: unknown, f="") => String(v ?? "").trim() || f;
const num = (v: unknown, f=0) => Number.isFinite(Number(v)) ? Number(v) : f;
const obj = (v: unknown): Record<string, any> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, any> : {};
function storageKey(p: MarketingPopup, suffix: string){return `mk-popup:${p.id}:${suffix}`}
function getSessionId(){const k="mk-popup-session-id";let v=sessionStorage.getItem(k);if(!v){v=crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`;sessionStorage.setItem(k,v)}return v}
function hiddenByFrequency(p:MarketingPopup){const f=text(p.content?.frequency,"once_session");if(f==="every_visit")return false;if(f==="once_session")return sessionStorage.getItem(storageKey(p,"shown"))==="1";if(f==="once_visitor")return localStorage.getItem(storageKey(p,"shown"))==="1";if(f==="once_day"){const v=localStorage.getItem(storageKey(p,"shown-at"));return v?Date.now()-Number(v)<86400000:false}return false}
function markShown(p:MarketingPopup){sessionStorage.setItem(storageKey(p,"shown"),"1");localStorage.setItem(storageKey(p,"shown"),"1");localStorage.setItem(storageKey(p,"shown-at"),String(Date.now()))}

function PopupMedia({ popup }:{popup:MarketingPopup}){
  const type=text(popup.content?.mediaType,"none"), url=text(popup.content?.mediaUrl), poster=text(popup.content?.mediaThumbnailUrl);
  if(!url||type==="none") return null;
  if(type==="video") return <video className="mk-marketing-popup__media" src={url} poster={poster||undefined} autoPlay muted loop playsInline controls/>;
  return <img className="mk-marketing-popup__media" src={url} alt=""/>;
}

export default function MarketingPopupRuntime({data,device}:Props){
  const pathname=usePathname()||"/", router=useRouter();
  const context=useMemo(()=>resolvePopupContext(data,pathname),[data,pathname]);
  const [popup,setPopup]=useState<MarketingPopup|null>(null),[open,setOpen]=useState(false),[cart,setCart]=useState<PopupCart|null>(null);
  const timerRef=useRef<number|null>(null), impressionSent=useRef(false);
  const track=useCallback(async(eventType:string,metadata:Record<string,any>={})=>{if(!popup)return;try{await fetch("/api/marketing/popups/events",{method:"POST",headers:{"Content-Type":"application/json"},keepalive:true,body:JSON.stringify({popupId:popup.id,eventType,sessionId:getSessionId(),pageType:context.pageType,pageReferenceId:context.referenceId,deviceType:device,metadata})})}catch{}},[popup,context,device]);

  useEffect(()=>{let cancelled=false;setPopup(null);setOpen(false);impressionSent.current=false;const params=new URLSearchParams({pageType:context.pageType,pathname:context.pathname,device});if(context.referenceId)params.set("referenceId",context.referenceId);fetch(`/api/marketing/popups?${params}`,{cache:"no-store",credentials:"include"}).then(r=>r.json().then(j=>({ok:r.ok,j}))).then(({ok,j})=>{if(!cancelled&&ok&&j?.data&&!hiddenByFrequency(j.data))setPopup(j.data)}).catch(()=>{});return()=>{cancelled=true;if(timerRef.current)clearTimeout(timerRef.current)}},[context.pageType,context.referenceId,context.pathname,device]);

  useEffect(()=>{if(!popup)return;const trigger=text(popup.triggerType,"immediate"),show=()=>{setOpen(true);markShown(popup)};if(trigger==="exit_intent"&&device==="desktop"){const h=(e:MouseEvent)=>{if(e.clientY<=4)show()};document.addEventListener("mouseout",h);return()=>document.removeEventListener("mouseout",h)}if(trigger==="scroll"){const threshold=Math.min(95,Math.max(5,num(popup.content?.scrollPercent,50)));const h=()=>{const max=document.documentElement.scrollHeight-innerHeight;if(max>0&&scrollY/max*100>=threshold){show();removeEventListener("scroll",h)}};addEventListener("scroll",h,{passive:true});return()=>removeEventListener("scroll",h)}timerRef.current=window.setTimeout(show,trigger==="delayed"?Math.max(0,num(popup.content?.delaySeconds,3)*1000):0);return()=>{if(timerRef.current)clearTimeout(timerRef.current)}},[popup,device]);

  useEffect(()=>{if(!open||!popup)return;if(!impressionSent.current){impressionSent.current=true;void track("popup_impression")}if(["abandoned_cart","free_shipping"].includes(popup.popupType)){fetch("/api/cart",{cache:"no-store"}).then(r=>r.json()).then(j=>{const d=j?.data||j||{};const items=Array.isArray(d.items)?d.items:[];const summary=d.summary||{};setCart({items:items.map((i:any)=>({id:String(i.id),productId:String(i.product_id||i.productId||""),name:text(i.name||i.product?.name),qty:num(i.qty,1),imageUrl:text(i.image_url||i.imageUrl||i.product?.image_url),priceLabel:text(i.unit_price_label||i.priceLabel||i.unit_price)})),subtotal:num(summary.subtotal?.amount??summary.subtotal??0),total:num(summary.total?.amount??summary.total??0),subtotalLabel:text(summary.subtotal?.formatted||summary.subtotal_label||summary.subtotal),totalLabel:text(summary.total?.formatted||summary.total_label||summary.total)});}).catch(()=>{})}},[open,popup,track]);

  if(!popup||!open)return null;
  const d=obj(popup.design), placement=text(d.placement,device==="mobile"?"bottom_sheet":"center_modal"), allowClose=obj(popup.content.typeData).allowClose!==false && !(popup.popupType==="special_alert"&&obj(popup.content.typeData).blockClose);
  const style={"--mk-popup-bg":text(d.backgroundColor,"#fff"),"--mk-popup-text":text(d.textColor,"#15353d"),"--mk-popup-button":text(d.buttonColor,"#0d8f74"),"--mk-popup-radius":`${num(d.borderRadius,24)}px`} as React.CSSProperties;
  const close=()=>{setOpen(false);void track("popup_close")};
  const navigate=(url:string)=>{if(!url)return;if(/^https?:\/\//i.test(url))window.open(url,"_blank","noopener,noreferrer");else router.push(url.startsWith("/")?url:`/${url}`)};
  const primary=(metadata:Record<string,any>={})=>{void track("popup_primary_action",metadata);const td=obj(popup.content.typeData);if(popup.popupType==="whatsapp"){const phone=text(td.phone).replace(/\D/g,""),message=text(td.prefilledMessage||td.message);if(phone)window.open(`https://wa.me/${phone}${message?`?text=${encodeURIComponent(message)}`:""}`,"_blank");return}navigate(text(popup.content.buttonUrl))};
  const secondary=()=>{void track("popup_secondary_action");navigate(text(obj(popup.content.typeData).secondaryUrl))};
  const copyCoupon=(code:string)=>{navigator.clipboard?.writeText(code);void track("popup_coupon_copy",{code})};
  const addProduct=async(product:PopupProduct)=>{if(product.hasOptions){navigate(product.href);return}try{const r=await fetch("/api/cart/items",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId:product.id,qty:1})});if(!r.ok)throw new Error();window.dispatchEvent(new Event("cart:changed"));void track("popup_add_to_cart",{productId:product.id})}catch{navigate(product.href)}};
  const submit=async(payload:Record<string,any>)=>{try{const r=await fetch("/api/marketing/popups/submissions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({popupId:popup.id,submissionType:popup.popupType,payload,sessionId:getSessionId(),pageType:context.pageType,pageReferenceId:context.referenceId,deviceType:device})});if(r.ok){void track("popup_form_submit",{fields:Object.keys(payload)});return true}}catch{}return false};

  return <div className={`mk-marketing-popup-layer mk-marketing-popup-layer--${device}`} style={style} data-placement={placement} data-popup-type={popup.popupType}>
    <button className="mk-marketing-popup__backdrop" onClick={allowClose?close:undefined} aria-label="إغلاق"/>
    <section className={`mk-marketing-popup mk-marketing-popup--${popup.popupType}`} role="dialog" aria-modal="true" aria-label={popup.name}>
      {allowClose?<button className="mk-marketing-popup__close" onClick={close}><X size={20}/></button>:null}
      <PopupMedia popup={popup}/>
      <div className="mk-marketing-popup__body"><PopupRenderer popup={popup} cart={cart} actions={{primary,secondary,close,navigate,copyCoupon,addProduct,submit}}/></div>
    </section>
  </div>;
}
