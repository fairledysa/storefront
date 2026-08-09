"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowDownLeft, ArrowUpRight, Gift, Info, Loader2, Plus, RefreshCcw, RotateCcw, ShoppingBag, Wallet } from "lucide-react";
import AccountLayout from "./AccountLayout";
import WalletWithdrawalPanel from "../../components/WalletWithdrawalPanel";
import WalletTopupPanel from "../../components/WalletTopupPanel";
import { useAccountCurrency } from "./account-currency";

type Filter = "all" | "credit" | "debit";
type Tx = {
  id: string;
  direction: string;
  transaction_type: string;
  amount: number;
  currency: string;
  reason: string | null;
  customer_message: string | null;
  status: string;
  created_at: string | null;
  order: { display_no: number } | null;
  metadata?: {
    source?: string;
    phase?: string;
    sender_customer_id?: string;
    recipient_customer_id?: string;
  };
  counterparty?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  } | null;
};
type Data = { wallet:{currency:string;available_balance:number;pending_balance:number;lifetime_credit:number;lifetime_debit:number;status:string}; transactions:Tx[]; settings?:{topup_enabled?:boolean;withdrawal_enabled?:boolean;gifting_enabled?:boolean;minimum_withdrawal_amount?:number;withdrawal_processing_days?:number;minimum_topup_amount?:number;maximum_topup_amount?:number|null;moyasar_ready?:boolean} };

const statusLabels:Record<string,string>={posted:"مكتمل",pending:"قيد المعالجة",cancelled:"ملغي",reversed:"تم العكس",failed:"فشل"};
const typeLabels:Record<string,string>={manual_credit:"إضافة رصيد",manual_debit:"خصم رصيد",adjustment_credit:"تسوية رصيد بالإضافة",adjustment_debit:"تسوية رصيد بالخصم",refund_credit:"استرجاع مبلغ",cashback_credit:"مكافأة نقدية",order_payment_debit:"استخدام الرصيد في طلب",order_payment_reversal:"استرجاع رصيد طلب",topup_credit:"إضافة رصيد",gift_credit:"هدية رصيد",gift_debit:"إهداء رصيد",withdrawal_hold:"طلب سحب",withdrawal_debit:"سحب رصيد",withdrawal_release:"إعادة مبلغ السحب",hold_created:"حجز مبلغ",hold_released:"إلغاء حجز مبلغ",hold_cancelled:"إلغاء حجز مبلغ"};
function symbol(code:string){return ({SAR:"ر.س",AED:"د.إ",KWD:"د.ك",BHD:"د.ب",OMR:"ر.ع",QAR:"ر.ق",YER:"ر.ي",USD:"$",EUR:"€"} as Record<string,string>)[code]||code}
function money(v:number,c:string,signed?:string){const sign=signed==="debit"?"−":signed==="credit"?"+":"";return `${sign}${new Intl.NumberFormat("ar-SA",{maximumFractionDigits:2}).format(Math.abs(Number(v)||0))} ${symbol(c)}`}
function date(v:string|null){if(!v)return "";const d=new Date(v);if(Number.isNaN(d.getTime()))return "";return `${new Intl.DateTimeFormat("ar-SA",{day:"numeric",month:"long",year:"numeric"}).format(d)} - ${new Intl.DateTimeFormat("ar-SA",{hour:"numeric",minute:"2-digit"}).format(d)}`}
function title(t:Tx){
  const no=t.order?.display_no?` #${t.order.display_no}`:"";
  const other=t.counterparty?.name?.trim();
  if(t.transaction_type==="gift_credit") return other?`هدية رصيد من ${other}`:"هدية رصيد";
  if(t.transaction_type==="gift_debit") return other?`إهداء رصيد إلى ${other}`:"إهداء رصيد";
  if(t.metadata?.source?.includes("refund")||t.transaction_type==="order_payment_reversal")return `استرجاع من الطلب${no}`;
  if(t.metadata?.source?.includes("deduct")||t.transaction_type==="order_payment_debit")return `استخدام الرصيد في الطلب${no}`;
  return `${typeLabels[t.transaction_type]|| (t.direction==="debit"?"خصم رصيد":"إضافة رصيد")}${no}`;
}
function icon(t:Tx){if(t.transaction_type.includes("gift"))return <Gift size={18}/>;if(t.transaction_type.includes("refund")||t.transaction_type.includes("reversal"))return <RotateCcw size={18}/>;if(t.order)return <ShoppingBag size={18}/>;return t.direction==="debit"?<ArrowUpRight size={18}/>:<ArrowDownLeft size={18}/>}

export default function WalletScreen(){
 const router=useRouter();
 const accountCurrency=useAccountCurrency();
 const [data,setData]=useState<Data|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[filter,setFilter]=useState<Filter>("all");
 const load=useCallback(async()=>{setLoading(true);setError("");try{const r=await fetch("/api/account/wallet",{cache:"no-store",credentials:"include"});const j=await r.json();if(!r.ok||!j?.ok)throw new Error(j?.error||"LOAD_FAILED");setData(j)}catch{setError("تعذر تحميل بيانات المحفظة") }finally{setLoading(false)}},[]);
 useEffect(()=>{void load()},[load]);
 const rows=useMemo(()=>data?.transactions.filter(t=>filter==="all"||t.direction===filter)||[],[data,filter]);
 const walletStatus=String(data?.wallet?.status||"active").toLowerCase();
 const walletRestricted=walletStatus!=="active";
 const walletStatusLabel=walletStatus==="frozen"?"المحفظة مجمّدة":walletStatus==="closed"?"المحفظة مغلقة":"المحفظة نشطة";
 return <AccountLayout active="wallet" title="الرصيد" subtitle="تابع رصيدك وحركات المحفظة واستخدمه في طلباتك القادمة.">
  <div className="mk-wallet">
   <aside className="mk-wallet__aside"><div className="mk-wallet-tipCard"><div className="mk-wallet-tipCard__icon"><Wallet size={22}/></div><div className="mk-wallet-tipCard__title">محفظتك في مكان واحد</div><div className="mk-wallet-tipCard__text">يمكنك متابعة الإضافات والخصومات والاسترجاعات المرتبطة بطلباتك.</div><WalletTopupPanel enabled={!!data?.settings?.topup_enabled} providerReady={!!data?.settings?.moyasar_ready} disabled={walletRestricted} currency={data?.wallet?.currency||accountCurrency.base.code} minimumAmount={Number(data?.settings?.minimum_topup_amount||10)} maximumAmount={data?.settings?.maximum_topup_amount==null?null:Number(data.settings.maximum_topup_amount)} /></div></aside>
   <div className="mk-wallet__main">
    {loading?<div className="mk-wallet-empty"><Loader2 className="animate-spin"/> جارٍ تحميل المحفظة...</div>:error?<div className="mk-wallet-empty"><AlertCircle/><b>{error}</b><button onClick={load}><RefreshCcw size={16}/> إعادة المحاولة</button></div>:data&&<>
     <section className="mk-wallet-hero"><div className="mk-wallet-hero__art"><div className="mk-wallet-hero__wallet"><Wallet size={92}/></div></div><div className="mk-wallet-hero__content"><div className="mk-wallet-hero__summary"><div className="mk-wallet-hero__label">رصيد محفظتك</div><div dir="ltr" className="mk-wallet-hero__amount">{accountCurrency.format(data.wallet.available_balance,data.wallet.currency)}</div><div className="mk-wallet-hero__hint"><Info size={15}/> الرصيد المتاح</div><div className="mk-wallet-hero__hint">{walletStatusLabel}</div>{data.wallet.pending_balance>0&&<div className="mk-wallet-hero__hint">قيد المعالجة: {accountCurrency.format(data.wallet.pending_balance,data.wallet.currency)}</div>}{walletRestricted&&<div className="mk-wallet-hero__hint"><AlertCircle size={15}/> لا يمكن استخدام المحفظة حاليًا. تواصل مع المتجر لمزيد من التفاصيل.</div>}</div><div className="mk-wallet-hero__bottom"><div className="mk-wallet-hero__stats"><div className="mk-wallet-stat"><span className="mk-wallet-stat__icon"><ArrowDownLeft size={18}/></span><div><div className="mk-wallet-stat__value">{accountCurrency.format(data.wallet.lifetime_credit,data.wallet.currency)}</div><div className="mk-wallet-stat__label">إجمالي الإضافات</div></div></div><div className="mk-wallet-stat"><span className="mk-wallet-stat__icon"><ArrowUpRight size={18}/></span><div><div className="mk-wallet-stat__value">{accountCurrency.format(data.wallet.lifetime_debit,data.wallet.currency)}</div><div className="mk-wallet-stat__label">إجمالي الخصومات</div></div></div></div><div className="mk-wallet-hero__actions"><WalletWithdrawalPanel enabled={!!data.settings?.withdrawal_enabled} availableBalance={data.wallet.available_balance} currency={data.wallet.currency} minimumAmount={Number(data.settings?.minimum_withdrawal_amount||50)} processingDays={Number(data.settings?.withdrawal_processing_days||3)} disabled={walletRestricted}/><button type="button" disabled={!data.settings?.gifting_enabled||walletRestricted} onClick={()=>router.push("/account/gift-balance")} className="mk-wallet-action mk-wallet-action--soft"><Gift size={17}/> {walletRestricted?walletStatusLabel:data.settings?.gifting_enabled?"إهداء رصيد":"الإهداء قريبًا"}</button><WalletTopupPanel enabled={!!data.settings?.topup_enabled} providerReady={!!data.settings?.moyasar_ready} disabled={walletRestricted} currency={data.wallet.currency} minimumAmount={Number(data.settings?.minimum_topup_amount||10)} maximumAmount={data.settings?.maximum_topup_amount==null?null:Number(data.settings.maximum_topup_amount)} /></div></div></div></section>
     <section className="mk-wallet-history"><div className="mk-wallet-history__head"><div><h2>حركات الرصيد</h2><p>الأحدث أولاً</p></div><div className="mk-wallet-history__filters">{([['all','الكل'],['credit','إضافة'],['debit','خصم']] as const).map(([k,l])=><button key={k} onClick={()=>setFilter(k)} className={filter===k?"is-active":""}>{l}</button>)}</div></div><div className="mk-wallet-history__list">{rows.length===0?<div className="mk-wallet-empty">لا توجد حركات رصيد حتى الآن</div>:rows.map((t,i)=><div className="mk-wallet-row" key={t.id} style={{animationDelay:`${i*35}ms`}}><div dir="ltr" className={`mk-wallet-row__amount ${t.direction==='debit'?'is-negative':'is-positive'}`}>{accountCurrency.format(t.amount,t.currency,t.direction as "credit"|"debit")}</div><div className={`mk-wallet-row__badge ${t.direction==='debit'?'is-debit':'is-credit'}`}>{statusLabels[t.status]||t.status}</div><div className="mk-wallet-row__date">{date(t.created_at)}</div><div className="mk-wallet-row__content"><div className="mk-wallet-row__title">{title(t)}</div><div className="mk-wallet-row__subtitle">{t.customer_message||t.reason||"حركة على رصيد المحفظة"}</div></div><div className="mk-wallet-row__icon">{icon(t)}</div></div>)}</div></section>
    </>}
   </div>
  </div>
 </AccountLayout>
}
