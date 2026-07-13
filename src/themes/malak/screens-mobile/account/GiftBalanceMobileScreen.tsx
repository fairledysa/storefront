"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Gift, Loader2, RefreshCcw, ShieldCheck, User, Wallet } from "lucide-react";
import AccountMobileLayout from "./AccountMobileLayout";
import { useAccountCurrency } from "../../screens/account/account-currency";



type GiftRow = { id:string; direction:"sent"|"received"; amount:number; currency:string; message:string|null; status:string; created_at:string|null; customer:{name:string} };
type GiftData = { settings:{gifting_enabled?:boolean;gift_preset_amounts?:number[]}; wallet:{currency:string;available_balance:number;status:string}; gifts:GiftRow[] };

function amountNumber(value:string){const n=Number(String(value).replace(/[^\d.]/g,""));return Number.isFinite(n)?n:0}
function money(value:number,currency:string){return `${new Intl.NumberFormat("ar-SA-u-nu-arab",{maximumFractionDigits:2}).format(value)} ${currency}`}
function date(value:string|null){if(!value)return "";const d=new Date(value);if(Number.isNaN(d.getTime()))return "";return new Intl.DateTimeFormat("ar-SA-u-nu-arab",{day:"numeric",month:"short",year:"numeric"}).format(d)}
function errorMessage(code:string){return ({INVALID_GIFT_DATA:"أدخل المبلغ وبيانات المستلم.",RECIPIENT_NOT_FOUND:"المستلم غير موجود في هذا المتجر.",CANNOT_GIFT_TO_SELF:"لا يمكنك الإهداء إلى حسابك نفسه.",INSUFFICIENT_WALLET_BALANCE:"رصيدك غير كافٍ.",WALLET_GIFTING_DISABLED:"إهداء الرصيد غير مفعّل."} as Record<string,string>)[code]||"تعذر إرسال الهدية."}

export default function GiftBalanceMobileScreen(){
 const accountCurrency=useAccountCurrency();
 const [data,setData]=useState<GiftData|null>(null),[loading,setLoading]=useState(true),[submitting,setSubmitting]=useState(false);
 const [amount,setAmount]=useState(""),[recipient,setRecipient]=useState(""),[message,setMessage]=useState(""),[feedback,setFeedback]=useState<{type:"success"|"error";text:string}|null>(null);
 const load=useCallback(async()=>{setLoading(true);try{const r=await fetch("/api/account/wallet/gifts",{cache:"no-store",credentials:"include"});const j=await r.json();if(!r.ok||!j?.ok)throw new Error(j?.error);setData(j)}catch{setFeedback({type:"error",text:"تعذر تحميل بيانات الإهداء."})}finally{setLoading(false)}},[]);
 useEffect(()=>{void load()},[load]);
 const presetAmounts=useMemo(()=>Array.isArray(data?.settings?.gift_preset_amounts)?data!.settings.gift_preset_amounts!.filter(v=>Number(v)>0):[],[data?.settings?.gift_preset_amounts]);
 useEffect(()=>{if(amount||!presetAmounts.length||accountCurrency.loading)return;const first=Number(presetAmounts[0]||0);if(first>0)setAmount(String(accountCurrency.toDisplay(first,accountCurrency.base.code)))},[amount,presetAmounts,accountCurrency]);
 const numericAmount=amountNumber(amount);const baseAmount=accountCurrency.toBase(numericAmount);
 const balanceAfter=useMemo(()=>Math.max(0,accountCurrency.toDisplay(Number(data?.wallet.available_balance||0),data?.wallet.currency)-numericAmount),[data?.wallet.available_balance,data?.wallet.currency,numericAmount,accountCurrency]);
 const canSubmit=Boolean(data?.settings?.gifting_enabled&&data?.wallet.status==="active"&&recipient.trim()&&numericAmount>0&&numericAmount<=accountCurrency.toDisplay(Number(data?.wallet.available_balance||0),data?.wallet.currency)&&!submitting);
 async function submit(){if(!canSubmit)return;setSubmitting(true);setFeedback(null);try{const r=await fetch("/api/account/wallet/gifts",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({recipient:recipient.trim(),amount:baseAmount,currency:accountCurrency.base.code,display_amount:numericAmount,display_currency:accountCurrency.active.code,exchange_rate_snapshot:accountCurrency.active.rate,message:message.trim(),idempotency_key:`gift:${crypto.randomUUID()}`})});const j=await r.json();if(!r.ok||!j?.ok)throw new Error(j?.error||"GIFT_SEND_FAILED");setFeedback({type:"success",text:`تم إرسال ${accountCurrency.format(baseAmount,accountCurrency.base.code)} إلى ${j?.recipient?.name||"المستلم"}.`});setRecipient("");setMessage("");await load()}catch(e:any){setFeedback({type:"error",text:errorMessage(String(e?.message||""))})}finally{setSubmitting(false)}}
 return <AccountMobileLayout active="gift_balance" title="إهداء رصيد">
  <section className="mk-mgift2">
   <header className="mk-mgift2__hero"><div><Gift size={28}/></div><h2>إهداء رصيد من محفظتك</h2><p>أدخل جوال العميل أو بريده، وسيصل الرصيد مباشرة إلى محفظته.</p><span><ShieldCheck size={15}/> تحويل فوري وآمن</span></header>
   {feedback?<div style={{padding:12,borderRadius:15,display:"flex",gap:8,alignItems:"center",background:feedback.type==="success"?"#ecfdf5":"#fef2f2",color:feedback.type==="success"?"#047857":"#b91c1c",fontWeight:800}}>{feedback.type==="success"?<CheckCircle2 size={17}/>:<AlertCircle size={17}/>} {feedback.text}</div>:null}
   <div className="mk-mgift2__steps">
    <section className="mk-mgift2-card"><div className="mk-mgift2-card__head"><b>1</b><strong>اختر مبلغ الهدية</strong></div><div className="mk-mgift2-amounts">{presetAmounts.map(item=>{const displayAmount=accountCurrency.toDisplay(item,accountCurrency.base.code);return <button key={item} type="button" className={Math.abs(numericAmount-displayAmount)<0.0001?"is-active":""} onClick={()=>setAmount(String(displayAmount))}>{accountCurrency.format(item,accountCurrency.base.code)}</button>})}</div><label className="mk-mgift2-field"><span>مبلغ مخصص</span><div><input value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal"/><Wallet size={17}/></div></label></section>
    <section className="mk-mgift2-card"><div className="mk-mgift2-card__head"><b>2</b><strong>بيانات المستلم</strong></div><label className="mk-mgift2-field"><span>رقم الجوال أو البريد الإلكتروني</span><div><input value={recipient} onChange={e=>setRecipient(e.target.value)} placeholder="05XXXXXXXX أو البريد" dir="ltr"/><User size={17}/></div></label><small style={{color:"#64748b",fontWeight:700}}>يجب أن يكون المستلم عميلًا مسجلًا في المتجر.</small></section>
    <section className="mk-mgift2-card"><div className="mk-mgift2-card__head"><b>3</b><strong>المراجعة والإرسال</strong></div><label className="mk-mgift2-message"><span>رسالة اختيارية</span><textarea value={message} maxLength={300} onChange={e=>setMessage(e.target.value)}/><small>{message.length}/300</small></label><div className="mk-mgift2-preview"><Gift size={22}/><strong>{accountCurrency.format(baseAmount,accountCurrency.base.code)}</strong><span>الرصيد بعد الإهداء: {`${new Intl.NumberFormat("ar-SA-u-nu-arab",{maximumFractionDigits:accountCurrency.active.decimals}).format(balanceAfter)} ${accountCurrency.active.symbol||accountCurrency.active.code}`}</span></div><div className="mk-mgift2-note"><CheckCircle2 size={16}/> يُخصم ويُضاف الرصيد في عملية واحدة.</div><button type="button" className="mk-mgift2-submit" disabled={!canSubmit} onClick={submit}>{submitting?<Loader2 size={18} className="animate-spin"/>:<Gift size={18}/>} {submitting?"جارٍ الإرسال...":"إرسال الهدية الآن"}</button>{!data?.settings?.gifting_enabled&&!loading?<div style={{color:"#b45309",fontWeight:800,textAlign:"center"}}>الإهداء غير مفعّل من المتجر.</div>:null}</section>
   </div>
   <section className="mk-mgift2-recent"><h3 style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>سجل هدايا الرصيد <button type="button" onClick={load} style={{border:0,background:"transparent"}}><RefreshCcw size={16}/></button></h3>{!loading&&(data?.gifts?.length||0)===0?<div style={{padding:14,color:"#64748b"}}>لا توجد هدايا حتى الآن.</div>:null}{(data?.gifts||[]).map(item=><article key={item.id}><strong>{item.customer.name}</strong><span>{item.direction==="sent"?"مرسلة":"مستلمة"}</span><span dir="ltr">{accountCurrency.format(item.amount,item.currency,item.direction==="sent"?"debit":"credit")}</span><b>{item.status==="completed"?"مكتملة":item.status}</b><small>{date(item.created_at)}</small></article>)}</section>
  </section>
 </AccountMobileLayout>
}