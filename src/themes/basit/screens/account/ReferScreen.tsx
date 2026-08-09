// FILE: apps/storefront/src/themes/basit/screens/account/ReferScreen.tsx
"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  Copy,
  Gift,
  Link2,
  Mail,
  RefreshCw,
  Share2,
  Sparkles,
  Users,
} from "lucide-react";
import AccountLayout from "./AccountLayout";
import {
  formatReferralDate,
  referralStatusLabel,
  rewardTypeLabel,
  useReferralsData,
} from "./referrals-data";
import { useAccountCurrency } from "./account-currency";

const STEPS = [
  { title: "شارك الرابط", text: "انسخ رابط الدعوة أو شاركه مع أصدقائك.", icon: Link2 },
  { title: "يسجل صديقك", text: "يدخل صديقك المتجر ويسجل حسابًا جديدًا.", icon: Users },
  { title: "تحصل على المكافأة", text: "تضاف المكافأة بعد تحقق شروط أول طلب.", icon: Gift },
];

export default function ReferScreen() {
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
        await navigator.share({ title: "دعوة للمتجر", text: "استخدم رابط دعوتي", url: data.referral_link });
        return;
      } catch {
        // fallback to copy
      }
    }
    await handleCopy();
  }

  const stats = [
    { label: "زيارات الرابط", value: data?.stats.visits ?? 0, icon: Mail },
    { label: "الأصدقاء المنضمون", value: data?.stats.joined ?? 0, icon: Users },
    { label: "الدعوات المؤهلة", value: data?.stats.qualified ?? 0, icon: Gift },
  ];

  if (!loading && !error && data && !data.settings.enabled) {
    return (
      <AccountLayout active="refer" title="أدع صديقًا">
        <section className="mk-refer" aria-label="برنامج دعوة الأصدقاء غير مفعّل">
          <section className="mk-refer-hero">
            <div className="mk-refer-hero__art" aria-hidden="true">
              <div className="mk-refer-hero__circle"><Gift size={42} /></div>
            </div>
            <div className="mk-refer-hero__content">
              <div>
                <h2>برنامج دعوة الأصدقاء غير متاح حاليًا</h2>
                <p>لم يفعّل المتجر برنامج الدعوات بعد. عند تفعيله ستظهر لك هنا تفاصيل المكافآت ورابط الدعوة الخاص بك.</p>
              </div>
            </div>
          </section>
        </section>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout active="refer" title="أدع صديقًا">
      <section className="mk-refer" aria-label="أدع صديقًا">
        {loading ? (
          <div className="mk-refer__lead">جارٍ تحميل بيانات الدعوات...</div>
        ) : error ? (
          <div className="mk-refer__lead" role="alert">
            <AlertCircle size={18} /> {error}
            <button type="button" onClick={() => void reload()}>
              <RefreshCw size={16} /> إعادة المحاولة
            </button>
          </div>
        ) : data ? (
          <div className="mk-refer__lead">
            شارك رابطك، وبعد أن يسجل صديقك ويكمل أول طلب مؤهل تحصل على {(data.settings.inviter_reward_type === "points" ? `${data.settings.inviter_reward_value.toLocaleString("ar-SA")} نقطة` : data.settings.inviter_reward_type === "coupon_percentage" ? `${data.settings.inviter_reward_value.toLocaleString("ar-SA")}%` : accountCurrency.format(data.settings.inviter_reward_value, data.settings.currency))}.
          </div>
        ) : null}

        <section className="mk-refer-hero">
          <div className="mk-refer-hero__art" aria-hidden="true">
            <div className="mk-refer-hero__circle"><Link2 size={42} /></div>
            <div className="mk-refer-hero__person mk-refer-hero__person--right"><Users size={26} /></div>
            <div className="mk-refer-hero__person mk-refer-hero__person--left"><Gift size={25} /></div>
            <Sparkles className="mk-refer-hero__spark mk-refer-hero__spark--one" size={18} />
            <Sparkles className="mk-refer-hero__spark mk-refer-hero__spark--two" size={16} />
          </div>

          <div className="mk-refer-hero__content">
            <div>
              <h2>شارك رابطك واربح</h2>
              <p>
                هذه هي المكافأة التي ستحصل عليها بعد أن يسجل صديقك عبر رابطك ويكمل أول طلب مؤهل. لن تُضاف المكافأة بمجرد مشاركة الرابط.
              </p>
            </div>

            <div className="mk-refer-linkBox">
              <button type="button" className="mk-refer-share" onClick={() => void handleShare()} disabled={!data?.referral_link || !data.settings.enabled}>
                <Share2 size={17} /><span>مشاركة</span>
              </button>
              <input readOnly value={data?.referral_link ?? ""} dir="ltr" placeholder="سيظهر رابط الدعوة بعد تفعيل البرنامج" />
              <button type="button" className="mk-refer-copy" onClick={() => void handleCopy()} disabled={!data?.referral_link || !data.settings.enabled}>
                {copied ? <Check size={17} /> : <Copy size={17} />}<span>{copyLabel}</span>
              </button>
            </div>

            <div className="mk-refer-codeLine"><span>رمز الدعوة:</span><b>{data?.code || "—"}</b></div>
          </div>
        </section>

        <div className="mk-refer-stats">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.label} className="mk-refer-stat">
                <div className="mk-refer-stat__icon"><Icon size={24} /></div>
                <div><span>{item.label}</span><strong>{item.value.toLocaleString("ar-SA")}</strong></div>
              </article>
            );
          })}
        </div>

        <div className="mk-refer__grid">
          <section className="mk-refer-card mk-refer-card--steps">
            <div className="mk-refer-card__head"><h3>كيف تعمل الدعوة؟</h3></div>
            <div className="mk-refer-steps">
              {STEPS.map((item, index) => {
                const Icon = item.icon;
                return (
                  <article key={item.title} className="mk-refer-step">
                    <div className="mk-refer-step__no">{index + 1}</div>
                    <div className="mk-refer-step__icon"><Icon size={22} /></div>
                    <div><h4>{item.title}</h4><p>{item.text}</p></div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="mk-refer-card mk-refer-card--rewards">
            <div className="mk-refer-card__head"><h3>مكافآت الدعوة</h3></div>
            <div className="mk-refer-rewards">
              <article className="mk-refer-reward">
                <div className="mk-refer-reward__icon"><Gift size={24} /></div>
                <span>مكافأتك بعد أول طلب مؤهل لصديقك</span><strong>{data ? (data.settings.inviter_reward_type === "points" ? `${data.settings.inviter_reward_value.toLocaleString("ar-SA")} نقطة` : data.settings.inviter_reward_type === "coupon_percentage" ? `${data.settings.inviter_reward_value.toLocaleString("ar-SA")}%` : accountCurrency.format(data.settings.inviter_reward_value, data.settings.currency)) : "—"}</strong>
                <small>تُضاف بعد تسجيل صديقك وإكمال أول طلب مستوفٍ للشروط.</small>
              </article>
              {data?.settings.invited_reward_type && data.settings.invited_reward_type !== "none" ? (
                <article className="mk-refer-reward">
                  <div className="mk-refer-reward__icon"><Users size={24} /></div>
                  <span>مكافأة صديقك بعد أول طلب مؤهل</span><strong>{(data.settings.invited_reward_type === "points" ? `${data.settings.invited_reward_value.toLocaleString("ar-SA")} نقطة` : data.settings.invited_reward_type === "coupon_percentage" ? `${data.settings.invited_reward_value.toLocaleString("ar-SA")}%` : accountCurrency.format(data.settings.invited_reward_value, data.settings.currency))}</strong>
                  <small>{rewardTypeLabel(data.settings.invited_reward_type)}</small>
                </article>
              ) : null}
            </div>
          </section>
        </div>

        <section className="mk-refer-card mk-refer-card--invites">
          <div className="mk-refer-card__head mk-refer-card__head--split"><h3>الدعوات الأخيرة</h3></div>
          {data?.invitations.length ? (
            <div className="mk-refer-table">
              <div className="mk-refer-table__row mk-refer-table__row--head">
                <span>الصديق</span><span>الحالة</span><span>المكافأة</span><span>تاريخ الدعوة</span>
              </div>
              {data.invitations.map((item) => {
                const inviterReward = item.rewards.find((reward) => reward.side === "inviter");
                return (
                  <div key={item.id} className="mk-refer-table__row">
                    <span>{item.customer_name}</span>
                    <span><b data-status={item.status}>{referralStatusLabel(item.status)}</b></span>
                    <span className="mk-refer-table__reward">{inviterReward ? (inviterReward.type === "points" ? `${inviterReward.value.toLocaleString("ar-SA")} نقطة` : inviterReward.type === "coupon_percentage" ? `${inviterReward.value.toLocaleString("ar-SA")}%` : accountCurrency.format(inviterReward.value, inviterReward.currency)) : "—"}</span>
                    <span>{formatReferralDate(item.registered_at)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mk-refer__lead">لا توجد دعوات مسجلة حتى الآن.</div>
          )}
        </section>

        {data?.settings.terms_text ? <section className="mk-refer-card"><h3>شروط البرنامج</h3><p>{data.settings.terms_text}</p></section> : null}
      </section>
    </AccountLayout>
  );
}