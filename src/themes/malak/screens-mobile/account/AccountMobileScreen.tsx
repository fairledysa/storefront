// FILE: apps/storefront/src/themes/malak/screens-mobile/account/AccountMobileScreen.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AccountMobileLayout from "./AccountMobileLayout";
import RequireCustomer from "../../screens/account/_components/RequireCustomer";

type Customer = {
  id?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone_e164?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  city_id?: string | null;
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

  return d.toLocaleDateString("ar-SA");
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

function EditProfileSheet({
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
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

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

  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(raf);
    }

    setVisible(false);
    const t = window.setTimeout(() => setMounted(false), 260);
    return () => window.clearTimeout(t);
  }, [open]);

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
      const box = document.getElementById("mobile-account-city-popover");
      if (!box) return;

      if (box.contains(t) || cityBtnRef.current?.contains(t as any)) return;
      setCityOpen(false);
    }

    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [cityOpen]);

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

  if (!mounted) return null;

  return (
    <div className="mk-mprofile-sheet">
      <div
        onClick={saving ? undefined : onClose}
        className={`mk-mprofile-sheet__overlay ${
          visible ? "is-visible" : ""
        }`}
      />

      <div
        dir="rtl"
        className={`mk-mprofile-sheet__panel ${visible ? "is-visible" : ""}`}
      >
        <div className="mk-mprofile-sheet__sticky">
          <div className="mk-mprofile-sheet__handleWrap">
            <div className="mk-mprofile-sheet__handle" />
          </div>

          <div className="mk-mprofile-sheet__head">
            <div>
              <div className="mk-mprofile-sheet__title">تعديل البيانات</div>
              <div className="mk-mprofile-sheet__desc">
                نفس بيانات حساب نسخة الكمبيوتر
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="mk-mprofile-sheet__close"
            >
              ×
            </button>
          </div>
        </div>

        <div className="mk-mprofile-sheet__form">
          {errorMsg ? (
            <div className="mk-mprofile-sheet__alert mk-mprofile-sheet__alert--error">
              {errorMsg}
            </div>
          ) : null}

          {successMsg ? (
            <div className="mk-mprofile-sheet__alert mk-mprofile-sheet__alert--success">
              {successMsg}
            </div>
          ) : null}

          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="الاسم"
            disabled={saving}
            className="mk-mprofile-input"
          />

          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="الجوال"
            disabled={saving}
            className="mk-mprofile-input"
          />

          <div className="mk-mprofile-dateGrid">
            <select
              value={by}
              onChange={(e) =>
                setBy(e.target.value ? Number(e.target.value) : "")
              }
              disabled={saving}
              className="mk-mprofile-select"
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
              disabled={saving}
              className="mk-mprofile-select"
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
              disabled={saving}
              className="mk-mprofile-select"
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
            disabled={saving}
            className="mk-mprofile-select"
          >
            <option value="">اختر الجنس</option>
            <option value="male">ذكر</option>
            <option value="female">أنثى</option>
          </select>

          <div className="mk-mprofile-city">
            <button
              ref={cityBtnRef}
              type="button"
              onClick={() => setCityOpen((v) => !v)}
              disabled={saving || citiesLoading}
              className="mk-mprofile-cityBtn"
            >
              <span
                className={
                  selectedCity
                    ? "mk-mprofile-cityBtn__value"
                    : "mk-mprofile-cityBtn__placeholder"
                }
              >
                {citiesLoading
                  ? "جاري تحميل المدن..."
                  : selectedCity
                    ? selectedCity.name_ar
                    : "اختر المدينة"}
              </span>

              <span className="mk-mprofile-cityBtn__chev">▾</span>
            </button>

            {cityOpen ? (
              <div
                id="mobile-account-city-popover"
                className="mk-mprofile-cityPop"
              >
                <div className="mk-mprofile-cityPop__searchWrap">
                  <input
                    ref={citySearchRef}
                    value={cityQuery}
                    onChange={(e) => setCityQuery(e.target.value)}
                    placeholder="ابحث عن مدينتك..."
                    className="mk-mprofile-cityPop__search"
                  />
                </div>

                <div className="mk-mprofile-cityPop__list">
                  {filteredCities.length === 0 ? (
                    <div className="mk-mprofile-cityPop__empty">
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
                        className={`mk-mprofile-cityPop__item ${
                          c.id === cityId ? "is-active" : ""
                        }`}
                      >
                        <span className="mk-mprofile-cityPop__ar">
                          {c.name_ar}
                        </span>
                        <span className="mk-mprofile-cityPop__en">
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
            className="mk-mprofile-input mk-mprofile-input--readonly"
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
            className="mk-mprofile-submit"
          >
            {saving ? "جاري الحفظ..." : "حفظ البيانات"}
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="mk-mprofile-cancel"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AccountMobileScreen() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

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

  const missingFields = useMemo(() => {
    if (state.kind !== "ready") return [];

    const c = state.customer;
    const out: string[] = [];

    if (!s(c.full_name)) out.push("الاسم");
    if (!s(c.phone_e164)) out.push("الجوال");
    if (!s(c.email)) out.push("البريد الإلكتروني");
    if (!s(c.gender)) out.push("الجنس");
    if (!s(c.birth_date)) out.push("تاريخ الميلاد");

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

  return (
    <RequireCustomer>
      <AccountMobileLayout active="account" title="حسابي">
        <EditProfileSheet
          open={editOpen}
          customer={state.kind === "ready" ? state.customer : null}
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
          <div className="mk-maccount-card">
            <div className="mk-maccount-card__muted">
              جاري تحميل بيانات الحساب...
            </div>
          </div>
        ) : state.kind === "unauth" ? (
          <div className="mk-maccount-card">
            <div className="mk-maccount-card__muted">
              لازم تسجل دخول عشان تشوف بيانات حسابك.
            </div>
          </div>
        ) : state.kind === "error" ? (
          <div className="mk-maccount-card mk-maccount-card--error">
            <div className="mk-maccount-card__error">{state.message}</div>
          </div>
        ) : (
          <div className="mk-maccount__grid">
            <div className="mk-maccount-profile">
              <div className="mk-maccount-profile__name">
                {valueLabel(state.customer.full_name)}
              </div>

              <div className="mk-maccount-profile__email">
                {valueLabel(state.customer.email)}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSaveError("");
                  setSaveSuccess("");
                  setEditOpen(true);
                }}
                className="mk-maccount-profile__btn"
              >
                تعديل البيانات
              </button>
            </div>

            {missingFields.length > 0 ? (
              <div className="mk-maccount-warning">
                <div className="mk-maccount-warning__title">
                  بيانات الحساب غير مكتملة
                </div>

                <div className="mk-maccount-warning__text">
                  الحقول الناقصة: {missingFields.join("، ")}
                </div>
              </div>
            ) : null}

            <div className="mk-maccount__cardsGrid">
              <div className="mk-maccount-card">
                <div className="mk-maccount-card__label">الاسم</div>
                <div className="mk-maccount-card__value">
                  {valueLabel(state.customer.full_name)}
                </div>
              </div>

              <div className="mk-maccount-card">
                <div className="mk-maccount-card__label">الجوال</div>
                <div className="mk-maccount-card__value">
                  {valueLabel(state.customer.phone_e164)}
                </div>
              </div>

              <div className="mk-maccount-card">
                <div className="mk-maccount-card__label">البريد الإلكتروني</div>
                <div className="mk-maccount-card__value">
                  {valueLabel(state.customer.email)}
                </div>
              </div>

              <div className="mk-maccount-card">
                <div className="mk-maccount-card__label">الجنس</div>
                <div className="mk-maccount-card__value">
                  {genderLabel(state.customer.gender)}
                </div>
              </div>

              <div className="mk-maccount-card">
                <div className="mk-maccount-card__label">تاريخ الميلاد</div>
                <div className="mk-maccount-card__value">
                  {birthDateLabel(state.customer.birth_date)}
                </div>
              </div>
            </div>
          </div>
        )}
      </AccountMobileLayout>
    </RequireCustomer>
  );
}