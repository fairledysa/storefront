// FILE: apps/storefront/src/themes/basit/screens/account/AccountScreen.tsx
"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
 

import {
  BadgeCheck,
  Bell,
  CalendarDays,
  ChevronLeft,
  LockKeyhole,
  Mail,
  MapPin,
  Megaphone,
  MonitorSmartphone,
  Pencil,
  Phone,
  Shield,
  ShieldCheck,
  Smartphone,
  User,
  VenusAndMars,
} from "lucide-react";
import AccountLayout from "./AccountLayout";

type Customer = {
  id?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone_e164?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  city_id?: string | null;
  created_at?: string | null;
};

type City = {
  id: string;
  name_ar: string;
  name_en?: string | null;
};

type State =
  | { kind: "loading" }
  | { kind: "unauth" }
  | { kind: "error"; message: string }
  | { kind: "ready"; customer: Customer };

function s(x: any) {
  return String(x ?? "").trim();
}

async function safeJson(r: Response) {
  try {
    return await r.json();
  } catch {
    return null;
  }
}

function getInitial(name?: string | null) {
  const value = s(name);
  return value ? value.slice(0, 1) : "س";
}

function genderLabel(v: any) {
  const x = s(v).toLowerCase();
  if (x === "male") return "ذكر";
  if (x === "female") return "أنثى";
  return "غير مضاف";
}

function birthDateLabel(v: any) {
  const x = s(v);
  if (!x) return "غير مضاف";

  const d = new Date(x);
  if (Number.isNaN(d.getTime())) return x;

  return d.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function memberSinceLabel(v: any) {
  const x = s(v);
  if (!x) return "";

  const d = new Date(x);
  if (Number.isNaN(d.getTime())) return "";

  return `عضو منذ ${d.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
  })}`;
}

function valueLabel(v: any) {
  const x = s(v);
  return x || "غير مضاف";
}

function normalizePhone(v: string) {
  return s(v).replace(/\s+/g, "");
}

function toYMDParts(v: any) {
  const x = s(v);
  if (!x) return { by: "", bm: "", bd: "" };

  const d = new Date(x);
  if (Number.isNaN(d.getTime())) return { by: "", bm: "", bd: "" };

  return {
    by: String(d.getFullYear()),
    bm: String(d.getMonth() + 1),
    bd: String(d.getDate()),
  };
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function InfoCard({
  label,
  value,
  icon,
  dir,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  dir?: "rtl" | "ltr" | "auto";
}) {
  const missing = value === "غير مضاف";

  return (
    <div className="mk-account-infoCard mk-account-infoCard--rich">
      <div className="mk-account-infoCard__icon">{icon}</div>

      <div className="mk-account-infoCard__body">
        <div className="mk-account-infoCard__label">{label}</div>

        <div
          dir={dir || "auto"}
          className={`mk-account-infoCard__value ${
            missing ? "is-missing" : ""
          }`}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function AccountAction({
  children,
  icon,
  variant = "dark",
  onClick,
}: {
  children: ReactNode;
  icon: ReactNode;
  variant?: "dark" | "light";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mk-account-profileAction mk-account-profileAction--${variant}`}
    >
      <span>{children}</span>
      {icon}
    </button>
  );
}

function SettingRow({
  icon,
  label,
  value,
  badge,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  badge?: "success" | "neutral";
}) {
  return (
    <button type="button" className="mk-account-settingRow">
      <span className="mk-account-settingRow__icon">{icon}</span>

      <span className="mk-account-settingRow__label">{label}</span>

      <span
        className={
          badge
            ? `mk-account-settingRow__badge mk-account-settingRow__badge--${badge}`
            : "mk-account-settingRow__value"
        }
      >
        {value}
      </span>

      <ChevronLeft size={16} strokeWidth={2.2} />
    </button>
  );
}

function AccountPanel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mk-account-panel">
      <div className="mk-account-panel__head">
        <span className="mk-account-panel__icon">{icon}</span>
        <h3 className="mk-account-panel__title">{title}</h3>
      </div>

      <div className="mk-account-panel__body">{children}</div>
    </div>
  );
}

function EditProfileModal({
  open,
  customer,
  saving,
  errorMsg,
  successMsg,
  onClose,
  onSave,
}: {
  open: boolean;
  customer: Customer | null;
  saving: boolean;
  errorMsg: string;
  successMsg: string;
  onClose: () => void;
  onSave: (payload: {
    full_name: string;
    phone_e164: string;
    gender: string;
    birth_date: string;
    city_id: string;
  }) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"" | "male" | "female">("");
  const [cityId, setCityId] = useState("");

  const [birthDate, setBirthDate] = useState("");
  const [by, setBy] = useState<number | "">("");
  const [bm, setBm] = useState<number | "">("");
  const [bd, setBd] = useState<number | "">("");

  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);

  const [cityOpen, setCityOpen] = useState(false);
  const [cityQuery, setCityQuery] = useState("");

  const cityBtnRef = useRef<HTMLButtonElement | null>(null);
  const citySearchRef = useRef<HTMLInputElement | null>(null);

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    const arr: number[] = [];
    for (let y = now; y >= now - 90; y--) arr.push(y);
    return arr;
  }, []);

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);

  const selectedCity = useMemo(
    () => cities.find((c) => c.id === cityId),
    [cities, cityId],
  );

  const filteredCities = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();
    if (!q) return cities;

    return cities.filter((c) => {
      const ar = s(c.name_ar).toLowerCase();
      const en = s(c.name_en).toLowerCase();
      return ar.includes(q) || en.includes(q);
    });
  }, [cities, cityQuery]);

  useEffect(() => {
    if (!open) return;

    setFullName(s(customer?.full_name));
    setPhone(s(customer?.phone_e164));
    setGender((s(customer?.gender) as "male" | "female" | "") || "");
    setCityId(s(customer?.city_id));

    const parts = toYMDParts(customer?.birth_date);
    setBy(parts.by ? Number(parts.by) : "");
    setBm(parts.bm ? Number(parts.bm) : "");
    setBd(parts.bd ? Number(parts.bd) : "");
  }, [open, customer]);

  useEffect(() => {
    if (!by || !bm || !bd) {
      setBirthDate("");
      return;
    }

    setBirthDate(`${by}-${pad2(Number(bm))}-${pad2(Number(bd))}`);
  }, [by, bm, bd]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    (async () => {
      setCitiesLoading(true);

      try {
        const res = await fetch("/api/ref/cities", {
          cache: "no-store",
          credentials: "include",
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(json?.message || json?.error || "CITIES_FAILED");
        }

        if (!cancelled) {
          setCities(Array.isArray(json?.cities) ? json.cities : []);
        }
      } catch {
        if (!cancelled) setCities([]);
      } finally {
        if (!cancelled) setCitiesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!cityOpen) {
      setCityQuery("");
      return;
    }

    setTimeout(() => citySearchRef.current?.focus(), 0);
  }, [cityOpen]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!cityOpen) return;

      const t = e.target as HTMLElement;
      const box = document.getElementById("account-city-popover");

      if (!box) return;
      if (box.contains(t) || cityBtnRef.current?.contains(t as any)) return;

      setCityOpen(false);
    }

    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [cityOpen]);

const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
  return () => setMounted(false);
}, []);

if (!open || !mounted) return null;

 return createPortal(
  <div className="mk-account-modal">
      <div
        className="mk-account-modal__overlay"
        onClick={saving ? undefined : onClose}
      />

      <div dir="rtl" className="mk-account-modal__card">
        <div className="mk-account-modal__head">
          <div>
            <div className="mk-account-modal__title">تعديل البيانات</div>
            <div className="mk-account-subtitle">
              حدّث بيانات حسابك الأساسية.
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mk-account-modal__close"
            disabled={saving}
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>

        {errorMsg ? (
          <div className="mk-account-alert mk-account-alert--error">
            {errorMsg}
          </div>
        ) : null}

        {successMsg ? (
          <div className="mk-account-alert mk-account-alert--success">
            {successMsg}
          </div>
        ) : null}

        <div className="mk-account-modal__body">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="الاسم"
            className="mk-account-input"
            disabled={saving}
          />

          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="الجوال"
            className="mk-account-input"
            disabled={saving}
          />

          <div className="mk-account-dateGrid">
            <select
              value={by}
              onChange={(e) =>
                setBy(e.target.value ? Number(e.target.value) : "")
              }
              className="mk-account-select"
              disabled={saving}
            >
              <option value="">السنة</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <select
              value={bm}
              onChange={(e) =>
                setBm(e.target.value ? Number(e.target.value) : "")
              }
              className="mk-account-select"
              disabled={saving}
            >
              <option value="">الشهر</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={bd}
              onChange={(e) =>
                setBd(e.target.value ? Number(e.target.value) : "")
              }
              className="mk-account-select"
              disabled={saving}
            >
              <option value="">اليوم</option>
              {days.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as any)}
            className="mk-account-select"
            disabled={saving}
          >
            <option value="">اختر الجنس</option>
            <option value="male">ذكر</option>
            <option value="female">أنثى</option>
          </select>

          <div className="mk-account-city">
            <button
              ref={cityBtnRef}
              type="button"
              onClick={() => setCityOpen((v) => !v)}
              className="mk-account-city__btn"
              disabled={saving || citiesLoading}
            >
              <span
                className={
                  selectedCity
                    ? "mk-account-city__value"
                    : "mk-account-city__placeholder"
                }
              >
                {citiesLoading
                  ? "جاري تحميل المدن..."
                  : selectedCity
                    ? selectedCity.name_ar
                    : "اختر المدينة"}
              </span>

              <span className="mk-account-city__chev">▾</span>
            </button>

            {cityOpen ? (
              <div id="account-city-popover" className="mk-account-cityPop">
                <div className="mk-account-cityPop__searchWrap">
                  <input
                    ref={citySearchRef}
                    value={cityQuery}
                    onChange={(e) => setCityQuery(e.target.value)}
                    placeholder="ابحث عن مدينتك..."
                    className="mk-account-cityPop__search"
                  />
                </div>

                <div className="mk-account-cityPop__list">
                  {filteredCities.length === 0 ? (
                    <div className="mk-account-cityPop__empty">
                      لا توجد نتائج
                    </div>
                  ) : (
                    filteredCities.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCityId(c.id);
                          setCityOpen(false);
                        }}
                        className={`mk-account-cityPop__item ${
                          c.id === cityId ? "is-active" : ""
                        }`}
                      >
                        <span className="mk-account-cityPop__ar">
                          {c.name_ar}
                        </span>
                        <span className="mk-account-cityPop__en">
                          {c.name_en}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <input
            value={s(customer?.email)}
            disabled
            placeholder="البريد الإلكتروني"
            className="mk-account-input"
          />

          <button
            disabled={saving}
            onClick={() =>
              onSave({
                full_name: s(fullName),
                phone_e164: normalizePhone(phone),
                gender: s(gender),
                birth_date: s(birthDate),
                city_id: s(cityId),
              })
            }
            className="mk-account-btn mk-account-btn--primary"
          >
            {saving ? "جاري الحفظ..." : "حفظ البيانات"}
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="mk-account-btn mk-account-btn--soft"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function AccountScreen() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [cityName, setCityName] = useState("");

  async function loadMe() {
    const r = await fetch("/api/auth/me", {
      cache: "no-store",
      credentials: "include",
    });

    const j = await safeJson(r);

    if (!r.ok || !j?.authed) {
      if (r.status === 401 || j?.authed === false) {
        setState({ kind: "unauth" });
        return;
      }

      setState({
        kind: "error",
        message: s(j?.error) || "تعذر تحميل بيانات الحساب",
      });
      return;
    }

    setState({
      kind: "ready",
      customer: j?.customer ?? {},
    });
  }

  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        setState({ kind: "loading" });
        await loadMe();
      } catch (e: any) {
        if (!alive) return;

        setState({
          kind: "error",
          message: s(e?.message) || "تعذر تحميل بيانات الحساب",
        });
      }
    }

    void run();

    return () => {
      alive = false;
    };
  }, []);

  const currentCityId = state.kind === "ready" ? s(state.customer.city_id) : "";

  useEffect(() => {
    if (!currentCityId) {
      setCityName("");
      return;
    }

    let cancelled = false;

    async function loadCityName() {
      try {
        const res = await fetch("/api/ref/cities", {
          cache: "no-store",
          credentials: "include",
        });

        const json = await safeJson(res);
        const rows: City[] = Array.isArray(json?.cities) ? json.cities : [];
        const found = rows.find((c) => c.id === currentCityId);

        if (!cancelled) {
          setCityName(s(found?.name_ar) || s(found?.name_en));
        }
      } catch {
        if (!cancelled) setCityName("");
      }
    }

    void loadCityName();

    return () => {
      cancelled = true;
    };
  }, [currentCityId]);

  const missingFields = useMemo(() => {
    if (state.kind !== "ready") return [];

    const c = state.customer;
    const out: string[] = [];

    if (!s(c.full_name)) out.push("الاسم");
    if (!s(c.phone_e164)) out.push("الجوال");
    if (!s(c.email)) out.push("البريد الإلكتروني");
    if (!s(c.gender)) out.push("الجنس");
    if (!s(c.birth_date)) out.push("تاريخ الميلاد");
    if (!s(c.city_id)) out.push("المدينة");

    return out;
  }, [state]);

  async function handleSave(payload: {
    full_name: string;
    phone_e164: string;
    gender: string;
    birth_date: string;
    city_id: string;
  }) {
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      if (!payload.full_name) {
        setSaveError("الاسم مطلوب.");
        return;
      }

      if (!payload.birth_date || !payload.gender || !payload.city_id) {
        setSaveError("أكمل الاسم وتاريخ الميلاد والجنس والمدينة.");
        return;
      }

      const profileRes = await fetch("/api/checkout/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          full_name: payload.full_name,
          phone_e164: payload.phone_e164 || null,
        }),
      });

      const profileJson = await safeJson(profileRes);

      if (!profileRes.ok) {
        setSaveError(
          s(profileJson?.message_ar) ||
            s(profileJson?.error) ||
            "تعذر حفظ الاسم والجوال",
        );
        return;
      }

      const onboardingRes = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          full_name: payload.full_name,
          birth_date: payload.birth_date,
          gender: payload.gender,
          city_id: payload.city_id,
        }),
      });

      const onboardingJson = await safeJson(onboardingRes);

      if (!onboardingRes.ok) {
        setSaveError(
          s(onboardingJson?.message) ||
            s(onboardingJson?.error) ||
            "تعذر حفظ بقية البيانات",
        );
        return;
      }

      await loadMe();
      setSaveSuccess("تم حفظ البيانات بنجاح.");
      window.dispatchEvent(new CustomEvent("auth:changed"));

      setTimeout(() => {
        setEditOpen(false);
        setSaveSuccess("");
      }, 700);
    } catch (e: any) {
      setSaveError(s(e?.message) || "تعذر حفظ البيانات");
    } finally {
      setSaving(false);
    }
  }

  const readyCustomer = state.kind === "ready" ? state.customer : null;
  const completed = state.kind === "ready" && missingFields.length === 0;

  return (
    <AccountLayout
      active="account"
      title="حسابي"
      subtitle="إدارة بيانات حسابك الأساسية وتحديث معلوماتك بسهولة."
      customerName={readyCustomer?.full_name}
      memberSince={memberSinceLabel(readyCustomer?.created_at)}
    >
      <EditProfileModal
        open={editOpen}
        customer={readyCustomer}
        saving={saving}
        errorMsg={saveError}
        successMsg={saveSuccess}
        onClose={() => {
          if (saving) return;
          setEditOpen(false);
          setSaveError("");
          setSaveSuccess("");
        }}
        onSave={handleSave}
      />

      {state.kind === "loading" ? (
        <div className="mk-account-state">جاري تحميل بيانات الحساب...</div>
      ) : state.kind === "unauth" ? (
        <div className="mk-account-state">
          لازم تسجل دخول عشان تشوف بيانات حسابك.
        </div>
      ) : state.kind === "error" ? (
        <div className="mk-account-state mk-account-state--error">
          {state.message}
        </div>
      ) : (
        <div className="mk-account-dashboard">
          <section className="mk-account-profileHero">
            <div className="mk-account-profileHero__actions">
              <AccountAction
                variant="dark"
                icon={<Pencil size={17} strokeWidth={2.1} />}
                onClick={() => {
                  setSaveError("");
                  setSaveSuccess("");
                  setEditOpen(true);
                }}
              >
                تعديل البيانات
              </AccountAction>

              <AccountAction
                variant="light"
                icon={<ShieldCheck size={17} strokeWidth={2.1} />}
              >
                إدارة الأمان
              </AccountAction>
            </div>

            <div className="mk-account-profileHero__divider" />

            <div className="mk-account-profileHero__contacts">
              <div className="mk-account-contactLine">
                <span className="mk-account-contactLine__icon">
                  <Phone size={18} strokeWidth={2} />
                </span>
                <span dir="ltr" className="mk-account-contactLine__value">
                  {valueLabel(state.customer.phone_e164)}
                </span>
                <span className="mk-account-contactLine__label">الجوال</span>
              </div>

              <div className="mk-account-contactLine">
                <span className="mk-account-contactLine__icon">
                  <Mail size={18} strokeWidth={2} />
                </span>
                <span dir="ltr" className="mk-account-contactLine__value">
                  {valueLabel(state.customer.email)}
                </span>
                <span className="mk-account-contactLine__label">
                  البريد الإلكتروني
                </span>
              </div>
            </div>

            <div className="mk-account-profileHero__identity">
              <div className="mk-account-avatarLg">
                {getInitial(state.customer.full_name)}
              </div>

              <div className="mk-account-profileHero__info">
                <h2 className="mk-account-profileHero__name">
                  {valueLabel(state.customer.full_name)}
                </h2>

                <div className="mk-account-profileHero__badges">
                  <span
                    className={`mk-account-chip ${
                      completed ? "mk-account-chip--success" : "mk-account-chip--warn"
                    }`}
                  >
                    {completed ? "الحساب مكتمل" : "الحساب غير مكتمل"}
                  </span>

                  <span className="mk-account-chip mk-account-chip--soft">
                    <BadgeCheck size={14} strokeWidth={2.2} />
                    موثق
                  </span>
                </div>

                {memberSinceLabel(state.customer.created_at) ? (
                  <div className="mk-account-profileHero__member">
                    <CalendarDays size={15} strokeWidth={2} />
                    {memberSinceLabel(state.customer.created_at)}
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          {missingFields.length > 0 ? (
            <div className="mk-account-warning">
              <div className="mk-account-warning__title">
                بيانات الحساب غير مكتملة
              </div>

              <div className="mk-account-warning__text">
                الحقول الناقصة: {missingFields.join("، ")}
              </div>
            </div>
          ) : null}

          <section className="mk-account-infoGrid mk-account-infoGrid--profile">
            <InfoCard
              label="الاسم"
              value={valueLabel(state.customer.full_name)}
              icon={<User size={21} strokeWidth={2} />}
            />

            <InfoCard
              label="الجوال"
              value={valueLabel(state.customer.phone_e164)}
              dir="ltr"
              icon={<Smartphone size={21} strokeWidth={2} />}
            />

            <InfoCard
              label="البريد الإلكتروني"
              value={valueLabel(state.customer.email)}
              dir="ltr"
              icon={<Mail size={21} strokeWidth={2} />}
            />

            <InfoCard
              label="الجنس"
              value={genderLabel(state.customer.gender)}
              icon={<VenusAndMars size={21} strokeWidth={2} />}
            />

            <InfoCard
              label="تاريخ الميلاد"
              value={birthDateLabel(state.customer.birth_date)}
              dir="ltr"
              icon={<CalendarDays size={21} strokeWidth={2} />}
            />

            <InfoCard
              label="المدينة"
              value={
                s(state.customer.city_id)
                  ? cityName || "جاري التحميل..."
                  : "غير مضاف"
              }
              icon={<MapPin size={21} strokeWidth={2} />}
            />
          </section>

          <section className="mk-account-panelsGrid">
            <AccountPanel
              title="إعدادات الحساب"
              icon={<ShieldCheck size={21} strokeWidth={2} />}
            >
              <SettingRow
                icon={<User size={18} strokeWidth={2} />}
                label="اللغة"
                value="العربية"
              />

              <SettingRow
                icon={<Bell size={18} strokeWidth={2} />}
                label="الإشعارات"
                value="قريبًا"
                badge="neutral"
              />

              <SettingRow
                icon={<Megaphone size={18} strokeWidth={2} />}
                label="الرسائل التسويقية"
                value="قريبًا"
                badge="neutral"
              />
            </AccountPanel>

            <AccountPanel
              title="الأمان والخصوصية"
              icon={<Shield size={21} strokeWidth={2} />}
            >
              <SettingRow
                icon={<LockKeyhole size={18} strokeWidth={2} />}
                label="تغيير كلمة المرور"
                value="قريبًا"
              />

              <SettingRow
                icon={<ShieldCheck size={18} strokeWidth={2} />}
                label="التحقق بخطوتين"
                value="غير مفعل"
                badge="neutral"
              />

              <SettingRow
                icon={<MonitorSmartphone size={18} strokeWidth={2} />}
                label="الأجهزة المسجلة"
                value="قريبًا"
                badge="neutral"
              />
            </AccountPanel>
          </section>
        </div>
      )}
    </AccountLayout>
  );
}