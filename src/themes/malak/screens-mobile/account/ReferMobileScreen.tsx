// FILE: apps/storefront/src/themes/malak/screens-mobile/account/ReferMobileScreen.tsx
"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Check, Copy, Gift, Link2, RefreshCw, Share2, Sparkles, Users } from "lucide-react";
import AccountMobileLayout from "./AccountMobileLayout";
import {
  formatReferralDate,
  referralStatusLabel,
  useReferralsData,
} from "../../screens/account/referrals-data";
import { useAccountCurrency } from "../../screens/account/account-currency";

const STEPS = [
  { title: "شارك الرابط", text: "انسخ رابط الدعوة أو شاركه مع أصدقائك.", icon: Link2 },
  { title: "يسجل صديقك", text: "يدخل صديقك المتجر ويسجل حسابًا جديدًا.", icon: Users },
  { title: "تحصل على المكافأة", text: "تضاف المكافأة بعد تحقق شروط أول طلب.", icon: Gift },
];

export default function ReferMobileScreen() {
  const accountCurrency = useAccountCurrency();
  const { data, loading, error, reload } = useReferralsData();
  const [copied, setCopied] = useState(false);
  const copyLabel = useMemo(() => (copied ? "تم النسخ" : "نسخ"), [copied]);

  async function handleCopy() {
    const link = String(data?.referral_link ?? "").trim();
    if (!link) return;

    let copiedOk = false;
    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(link);
        copiedOk = true;
      }
    } catch {
      copiedOk = false;
    }

    if (!copiedOk) {
      const textarea = document.createElement("textarea");
      textarea.value = link;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      textarea.style.pointerEvents = "none";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      copiedOk = document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setCopied(copiedOk);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function handleShare() {
    if (!data?.referral_link) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "دعوة للمتجر", url: data.referral_link });
        return;
      } catch {}
    }
    await handleCopy();
  }

  if (!loading && !error && data && !data.settings.enabled) {
    return (
      <AccountMobileLayout active="refer" title="أدع صديقًا">
        <section className="mk-mrefer2">
          <header className="mk-mrefer2-hero">
            <Gift size={34} />
            <h2>برنامج دعوة الأصدقاء غير متاح حاليًا</h2>
            <p>لم يفعّل المتجر برنامج الدعوات بعد. عند تفعيله ستظهر لك هنا المكافآت ورابط الدعوة الخاص بك.</p>
          </header>
        </section>
      </AccountMobileLayout>
    );
  }

  return (
    <AccountMobileLayout active="refer" title="أدع صديقًا">
      <section className="mk-mrefer2">
        {loading ? <div className="mk-mrefer2-card">جارٍ تحميل بيانات الدعوات...</div> : null}
        {error ? (
          <div className="mk-mrefer2-card" role="alert"><AlertCircle size={18} /> {error}<button type="button" onClick={() => void reload()}><RefreshCw size={16} /> إعادة المحاولة</button></div>
        ) : null}

        <header className="mk-mrefer2-hero">
          <Sparkles size={18} />
          <h2>شارك رابطك واربح</h2>
          <p>{data?.settings.enabled ? `احصل على ${(data.settings.inviter_reward_type === "points" ? `${data.settings.inviter_reward_value.toLocaleString("ar-SA-u-nu-arab")} نقطة` : data.settings.inviter_reward_type === "coupon_percentage" ? `${data.settings.inviter_reward_value.toLocaleString("ar-SA-u-nu-arab")}%` : accountCurrency.format(data.settings.inviter_reward_value, data.settings.currency))} بعد أن يسجل صديقك عبر رابطك ويكمل أول طلب مؤهل.` : "برنامج الدعوات غير مفعّل حاليًا."}</p>
          <div className="mk-mrefer2-link">
            <input readOnly value={data?.referral_link ?? ""} dir="ltr" placeholder="رابط الدعوة" />
            <button type="button" onClick={() => void handleCopy()} disabled={!data?.referral_link || !data.settings.enabled}>{copied ? <Check size={16} /> : <Copy size={16} />}{copyLabel}</button>
          </div>
          <div className="mk-mrefer2-code"><span>رمز الدعوة:</span><b>{data?.code || "—"}</b><button type="button" onClick={() => void handleShare()} disabled={!data?.referral_link || !data.settings.enabled}><Share2 size={15} /> مشاركة</button></div>
        </header>

        <section className="mk-mrefer2-stats">
          <article><Link2 size={20} /><span>زيارات الرابط</span><strong>{(data?.stats.visits ?? 0).toLocaleString("ar-SA-u-nu-arab")}</strong></article>
          <article><Users size={20} /><span>الأصدقاء المنضمون</span><strong>{(data?.stats.joined ?? 0).toLocaleString("ar-SA-u-nu-arab")}</strong></article>
          <article><Gift size={20} /><span>الدعوات المؤهلة</span><strong>{(data?.stats.qualified ?? 0).toLocaleString("ar-SA-u-nu-arab")}</strong></article>
        </section>

        <section className="mk-mrefer2-card">
          <h3>كيف تعمل الدعوة؟</h3>
          {STEPS.map((item, index) => {
            const Icon = item.icon;
            return <article key={item.title}><b>{index + 1}</b><Icon size={20} /><div><strong>{item.title}</strong><span>{item.text}</span></div></article>;
          })}
        </section>

        <section className="mk-mrefer2-rewards">
          <article><Gift size={22} /><span>مكافأتك بعد أول طلب مؤهل لصديقك</span><strong>{data ? (data.settings.inviter_reward_type === "points" ? `${data.settings.inviter_reward_value.toLocaleString("ar-SA-u-nu-arab")} نقطة` : data.settings.inviter_reward_type === "coupon_percentage" ? `${data.settings.inviter_reward_value.toLocaleString("ar-SA-u-nu-arab")}%` : accountCurrency.format(data.settings.inviter_reward_value, data.settings.currency)) : "—"}</strong><small>لا تُضاف بمجرد مشاركة الرابط.</small></article>
          {data?.settings.invited_reward_type && data.settings.invited_reward_type !== "none" ? <article><Users size={22} /><span>مكافأة صديقك بعد أول طلب مؤهل</span><strong>{(data.settings.invited_reward_type === "points" ? `${data.settings.invited_reward_value.toLocaleString("ar-SA-u-nu-arab")} نقطة` : data.settings.invited_reward_type === "coupon_percentage" ? `${data.settings.invited_reward_value.toLocaleString("ar-SA-u-nu-arab")}%` : accountCurrency.format(data.settings.invited_reward_value, data.settings.currency))}</strong></article> : null}
        </section>

        <section className="mk-mrefer2-invites">
          <div><h3>الدعوات الأخيرة</h3></div>
          {data?.invitations.length ? data.invitations.map((item) => {
            const inviterReward = item.rewards.find((reward) => reward.side === "inviter");
            return (
              <article key={item.id}>
                <strong>{item.customer_name}</strong>
                <span>{referralStatusLabel(item.status)}</span>
                <b>{inviterReward ? (inviterReward.type === "points" ? `${inviterReward.value.toLocaleString("ar-SA-u-nu-arab")} نقطة` : inviterReward.type === "coupon_percentage" ? `${inviterReward.value.toLocaleString("ar-SA-u-nu-arab")}%` : accountCurrency.format(inviterReward.value, inviterReward.currency)) : "—"}</b>
                <small>{formatReferralDate(item.registered_at)}</small>
              </article>
            );
          }) : <article><strong>لا توجد دعوات حتى الآن</strong></article>}
        </section>
      </section>
    </AccountMobileLayout>
  );
}