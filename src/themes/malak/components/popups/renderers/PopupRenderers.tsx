"use client";

import { useMemo, useState } from "react";
import { Bell, Check, ChevronLeft, Gift, HeartHandshake, MessageCircle, Package, PartyPopper, RotateCw, Send, Share2, ShoppingCart, Sparkles, Star, Truck, Users } from "lucide-react";
import type { MarketingPopup, PopupCart, PopupProduct } from "../types";
import { CouponBox, InlineStat, LinkButton, PopupHeading, PrimaryButton, ProductGrid, Progress, SecondaryButton, arr, n, o, t } from "./shared";

type Actions = {
  primary: (metadata?: Record<string, any>) => void;
  secondary: (metadata?: Record<string, any>) => void;
  close: () => void;
  navigate: (url: string) => void;
  copyCoupon: (code: string) => void;
  addProduct: (product: PopupProduct) => Promise<void>;
  submit: (payload: Record<string, any>) => Promise<boolean>;
};

type Props = { popup: MarketingPopup; cart: PopupCart | null; actions: Actions };

function Announcement({ popup, actions }: Props) {
  const d = o(popup.content.typeData);
  return <div className="mk-popup-template mk-popup-template--announcement"><span className="mk-popup-badge">{d.noticeType === "update" ? "تحديث مهم" : d.noticeType === "campaign" ? "حملة" : "إعلان"}</span><PopupHeading popup={popup}/><div className="mk-popup-actions"><PrimaryButton onClick={() => actions.primary()}>{t(popup.content.buttonText, "اعرف المزيد")}</PrimaryButton>{d.secondaryEnabled ? <SecondaryButton onClick={() => actions.secondary()}>{t(d.secondaryText, "لاحقًا")}</SecondaryButton> : null}</div></div>;
}

function Welcome({ popup, actions }: Props) {
  const d = o(popup.content.typeData);
  return <div className="mk-popup-template mk-popup-template--welcome"><div className="mk-popup-hero-icon"><Sparkles/></div><PopupHeading popup={popup} eyebrow="أهلًا بك"/>{d.giftEnabled ? <div className="mk-popup-gift"><Gift size={18}/>{t(d.giftText, "هدية ترحيبية بانتظارك")}</div> : null}<PrimaryButton onClick={() => actions.primary()}>{t(popup.content.buttonText, "ابدأ التسوق")}</PrimaryButton></div>;
}

function Discount({ popup, actions }: Props) {
  const d = o(popup.content.typeData); const code = t(d.couponCode || popup.content.couponCode); const value = n(d.discountValue);
  return <div className="mk-popup-template mk-popup-template--discount"><div className="mk-popup-discount-value">{d.discountType === "percentage" ? `${value}%` : d.discountType === "free_shipping" ? "شحن مجاني" : `${value} ر.س`}</div><PopupHeading popup={popup}/><CouponBox code={code} onCopy={() => actions.copyCoupon(code)}/>{d.countdown && d.expiresAt ? <Countdown target={t(d.expiresAt)}/> : null}<PrimaryButton onClick={() => actions.primary()}>{t(popup.content.buttonText, "تسوق العرض")}</PrimaryButton></div>;
}

function Countdown({ target }: { target: string }) {
  const end = new Date(target).getTime(); const left = Math.max(0, end - Date.now()); const hours = Math.floor(left / 3600000); const mins = Math.floor(left % 3600000 / 60000);
  return <div className="mk-popup-countdown"><span><strong>{hours}</strong> ساعة</span><span><strong>{mins}</strong> دقيقة</span></div>;
}

function LeadCapture({ popup, actions }: Props) {
  const d = o(popup.content.typeData); const [done,setDone] = useState(false); const [busy,setBusy] = useState(false);
  if (done) return <div className="mk-popup-template mk-popup-template--success"><div className="mk-popup-hero-icon"><Check/></div><h2>{t(d.successMessage, "تم الاشتراك بنجاح")}</h2></div>;
  return <form className="mk-popup-template mk-popup-template--lead" onSubmit={async e => { e.preventDefault(); setBusy(true); const fd = new FormData(e.currentTarget); const ok = await actions.submit(Object.fromEntries(fd.entries())); setBusy(false); if(ok) setDone(true); }}><PopupHeading popup={popup}/>{d.askName ? <input name="name" placeholder="الاسم"/> : null}{d.askEmail !== false ? <input name="email" type="email" placeholder="البريد الإلكتروني" required/> : null}{d.askPhone !== false ? <input name="phone" inputMode="tel" placeholder="رقم الجوال" required/> : null}{d.marketingConsent ? <label className="mk-popup-consent"><input type="checkbox" name="consent" required/> أوافق على استلام العروض التسويقية</label> : null}<PrimaryButton onClick={() => {}} disabled={busy}>{busy ? "جاري الإرسال..." : t(popup.content.buttonText, "اشتراك")}</PrimaryButton></form>;
}

function Whatsapp({ popup, actions }: Props) { const d=o(popup.content.typeData); return <div className="mk-popup-template mk-popup-template--whatsapp"><div className="mk-popup-whatsapp-icon"><MessageCircle/></div><PopupHeading popup={popup}/>{d.showHours ? <span className="mk-popup-hours">{t(d.hoursText)}</span>:null}<PrimaryButton onClick={() => actions.primary()}><MessageCircle size={18}/> {t(popup.content.buttonText,"تواصل عبر واتساب")}</PrimaryButton></div>; }

function Products({ popup, actions, variant }: Props & { variant: "recommendation"|"new"|"low" }) { const products=popup.products||[]; return <div className={`mk-popup-template mk-popup-template--products mk-popup-template--${variant}`}><PopupHeading popup={popup} eyebrow={variant==="new"?"وصل حديثًا":variant==="low"?"كمية محدودة":"مختار لك"}/><ProductGrid products={products} onOpen={p=>actions.navigate(p.href)} onAdd={variant!=="new"?p=>actions.addProduct(p):undefined}/>{products.length===0 ? <p className="mk-popup-empty">لا توجد منتجات متاحة حاليًا.</p>:null}</div>; }

function ExitIntent({ popup, actions }: Props) { const d=o(popup.content.typeData), code=t(d.exitCoupon); return <div className="mk-popup-template mk-popup-template--exit"><div className="mk-popup-hero-icon"><ShoppingCart/></div><PopupHeading popup={popup} eyebrow="قبل أن تغادر"/><CouponBox code={code} onCopy={()=>actions.copyCoupon(code)}/><PrimaryButton onClick={()=>actions.primary()}>{t(popup.content.buttonText,"أكمل التسوق")}</PrimaryButton></div>; }

function AbandonedCart({ popup, cart, actions }: Props) { const d=o(popup.content.typeData); const items=cart?.items||[]; return <div className="mk-popup-template mk-popup-template--cart"><PopupHeading popup={popup} eyebrow="سلتك ما زالت بانتظارك"/>{items.slice(0,3).map(i=><div className="mk-popup-cart-item" key={i.id}>{i.imageUrl?<img src={i.imageUrl} alt=""/>:null}<div><strong>{i.name}</strong><span>{i.qty} × {i.priceLabel}</span></div></div>)}{d.showTotal!==false&&cart?<InlineStat label="إجمالي السلة" value={cart.totalLabel}/>:null}<CouponBox code={t(d.recoveryCoupon)} onCopy={()=>actions.copyCoupon(t(d.recoveryCoupon))}/><PrimaryButton onClick={()=>actions.navigate("/cart")}>إكمال الطلب</PrimaryButton></div>; }

function FreeShipping({ popup, cart, actions }: Props) { const d=o(popup.content.typeData), threshold=n(d.threshold,200), subtotal=cart?.subtotal||0, left=Math.max(0,threshold-subtotal), pct=threshold?subtotal/threshold*100:100; return <div className="mk-popup-template mk-popup-template--shipping"><div className="mk-popup-hero-icon"><Truck/></div><PopupHeading popup={popup}/><strong className="mk-popup-shipping-message">{left>0?`باقي لك ${left.toFixed(2)} ر.س للشحن المجاني`:t(d.successText,"مبروك! حصلت على الشحن المجاني")}</strong>{d.progressBar!==false?<Progress value={pct}/>:null}{d.suggestProducts?<PrimaryButton onClick={()=>actions.primary()}>أكمل التسوق</PrimaryButton>:null}</div>; }

function Upsell({ popup, actions }: Props) { const products=popup.products||[], base=products[0], upgrade=products[1]; return <div className="mk-popup-template mk-popup-template--upsell"><PopupHeading popup={popup} eyebrow="ترقية أفضل"/><div className="mk-popup-compare">{base?<MiniProduct p={base}/>:null}<ChevronLeft/><>{upgrade?<MiniProduct p={upgrade}/>:null}</></div><PrimaryButton onClick={()=>upgrade&&actions.addProduct(upgrade)}>اختر الترقية</PrimaryButton><SecondaryButton onClick={()=>actions.close()}>استمر بخياري الحالي</SecondaryButton></div>; }
function MiniProduct({p}:{p:PopupProduct}){return <div className="mk-popup-mini-product">{p.imageUrl?<img src={p.imageUrl} alt=""/>:null}<strong>{p.name}</strong><span>{p.priceLabel}</span></div>}

function CrossSell({ popup, actions }: Props) { const products=popup.products||[]; return <div className="mk-popup-template mk-popup-template--cross"><PopupHeading popup={popup} eyebrow="يكمل طلبك"/><ProductGrid products={products} onOpen={p=>actions.navigate(p.href)} onAdd={p=>actions.addProduct(p)}/><PrimaryButton onClick={async()=>{for(const p of products) await actions.addProduct(p)}}>إضافة الجميع</PrimaryButton></div>; }

function SocialProof({ popup }: Props) { const d=o(popup.content.typeData); return <div className="mk-popup-template mk-popup-template--social"><Users/><div><strong>{t(popup.content.title,"نشاط حقيقي الآن")}</strong><p>{t(popup.content.description, popup.socialProof?.message || "اشترى عميل هذا المنتج مؤخرًا")}</p></div></div>; }

function Wheel({ popup, actions }: Props) { const d=o(popup.content.typeData); const [spin,setSpin]=useState(false); const prizes=String(d.prizes||"خصم 10%\nشحن مجاني\nحاول مرة أخرى").split("\n").filter(Boolean); return <div className="mk-popup-template mk-popup-template--wheel"><PopupHeading popup={popup}/><div className={`mk-popup-wheel ${spin?"is-spinning":""}`}>{prizes.slice(0,8).map((p,i)=><span key={i} style={{transform:`rotate(${i*360/prizes.length}deg)`}}>{p.split("|")[0]}</span>)}<b>اربح</b></div><PrimaryButton onClick={()=>{setSpin(true);setTimeout(()=>{setSpin(false);actions.primary({prize:prizes[0]})},1400)}}><RotateCw size={18}/> أدر العجلة</PrimaryButton></div>; }

function Survey({ popup, actions }: Props) { const d=o(popup.content.typeData); const opts=String(d.options||"").split("\n").filter(Boolean); const [selected,setSelected]=useState<string[]>([]); return <div className="mk-popup-template mk-popup-template--survey"><PopupHeading popup={popup}/><h3>{t(d.question,"ما رأيك؟")}</h3>{d.answerType==="text"?<textarea placeholder="اكتب إجابتك"/>:<div className="mk-popup-survey-options">{opts.map(x=><button className={selected.includes(x)?"is-selected":""} key={x} onClick={()=>setSelected(d.answerType==="multiple"?(selected.includes(x)?selected.filter(v=>v!==x):[...selected,x]):[x])}>{x}</button>)}</div>}<PrimaryButton onClick={()=>actions.submit({answers:selected})}>إرسال الإجابة</PrimaryButton></div>; }

function Rating({ popup, actions }: Props) { const d=o(popup.content.typeData); const [rating,setRating]=useState(0); return <div className="mk-popup-template mk-popup-template--rating"><PopupHeading popup={popup}/><div className="mk-popup-stars">{[1,2,3,4,5].map(v=><button className={v<=rating?"is-active":""} key={v} onClick={()=>setRating(v)}><Star fill="currentColor"/></button>)}</div>{d.commentEnabled!==false?<textarea placeholder="أخبرنا بالمزيد (اختياري)"/>:null}<PrimaryButton onClick={()=>actions.submit({rating})}>إرسال التقييم</PrimaryButton></div>; }

function Loyalty({ popup, actions }: Props) { const d=o(popup.content.typeData); return <div className="mk-popup-template mk-popup-template--loyalty"><div className="mk-popup-hero-icon"><HeartHandshake/></div><PopupHeading popup={popup}/>{popup.loyalty?<><InlineStat label="رصيد نقاطك" value={popup.loyalty.points}/>{d.showRewards&&popup.loyalty.rewards?.length?<div className="mk-popup-rewards">{popup.loyalty.rewards.slice(0,3).map(r=><span key={r.id}>{r.name} · {r.pointsCost} نقطة</span>)}</div>:null}</>:<div className="mk-popup-gift"><Gift size={18}/>اكسب {n(d.signupPoints)} نقطة عند التسجيل</div>}<PrimaryButton onClick={()=>actions.primary()}>{popup.loyalty?"عرض المكافآت":"انضم الآن"}</PrimaryButton></div>; }

function Referral({ popup, actions }: Props) { const d=o(popup.content.typeData); return <div className="mk-popup-template mk-popup-template--referral"><div className="mk-popup-hero-icon"><Share2/></div><PopupHeading popup={popup}/><div className="mk-popup-referral-rewards"><InlineStat label="مكافأتك" value={n(d.inviterRewardValue)}/><InlineStat label="مكافأة صديقك" value={n(d.friendRewardValue)}/></div><PrimaryButton onClick={()=>actions.primary()}><Send size={17}/> شارك الآن</PrimaryButton>{d.terms?<details><summary>الشروط</summary><p>{t(d.terms)}</p></details>:null}</div>; }

function SpecialAlert({ popup, actions }: Props) { const d=o(popup.content.typeData); const [accepted,setAccepted]=useState(false); return <div className="mk-popup-template mk-popup-template--alert"><div className="mk-popup-alert-icon"><Bell/></div><PopupHeading popup={popup} eyebrow="تنبيه مهم"/>{d.requireAcceptance?<label className="mk-popup-consent"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/> قرأت التنبيه وأوافق عليه</label>:null}<PrimaryButton onClick={()=>actions.primary({accepted})} disabled={d.requireAcceptance&&!accepted}>{t(d.acceptText,"فهمت")}</PrimaryButton></div>; }

export default function PopupRenderer(props: Props) {
  switch(props.popup.popupType){
    case "announcement": return <Announcement {...props}/>;
    case "welcome": return <Welcome {...props}/>;
    case "discount": return <Discount {...props}/>;
    case "lead_capture": return <LeadCapture {...props}/>;
    case "whatsapp": return <Whatsapp {...props}/>;
    case "product_recommendation": return <Products {...props} variant="recommendation"/>;
    case "exit_intent": return <ExitIntent {...props}/>;
    case "abandoned_cart": return <AbandonedCart {...props}/>;
    case "free_shipping": return <FreeShipping {...props}/>;
    case "upsell": return <Upsell {...props}/>;
    case "cross_sell": return <CrossSell {...props}/>;
    case "social_proof": return <SocialProof {...props}/>;
    case "low_stock": return <Products {...props} variant="low"/>;
    case "new_arrival": return <Products {...props} variant="new"/>;
    case "wheel": return <Wheel {...props}/>;
    case "survey": return <Survey {...props}/>;
    case "store_rating": return <Rating {...props}/>;
    case "loyalty": return <Loyalty {...props}/>;
    case "referral": return <Referral {...props}/>;
    case "special_alert": return <SpecialAlert {...props}/>;
    default: return <Announcement {...props}/>;
  }
}
