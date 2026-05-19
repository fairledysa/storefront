// FILE: apps/storefront/src/themes/malak/screens-mobile/account/AddressesMobileScreen.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AccountMobileLayout from "./AccountMobileLayout";

type Address = {
  id: string;
  label: string;
  full: string;
  national?: string | null;

  recipient_name?: string | null;
  phone_e164?: string | null;

  country_id?: string | null;
  city_id?: string | null;
  district_id?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  postal_code?: string | null;
};

type City = { id: string; name_ar: string; name_en?: string | null };
type District = { id: string; name_ar: string; name_en?: string | null };

type FormMode = "create" | "edit";

type State =
  | { kind: "loading" }
  | { kind: "unauth" }
  | { kind: "ready" }
  | { kind: "error"; message: string };

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

function isLoginRequired(r: Response, j: any) {
  return r.status === 401 || s(j?.error).toUpperCase() === "LOGIN_REQUIRED";
}

function openAuthModal() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("auth:open"));
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mk-maddr-field__label">{label}</div>
      {children}
    </div>
  );
}

function AddressFormSheet(props: {
  open: boolean;
  mode: FormMode;
  cities: City[];
  districts: District[];
  cityId: string;
  districtId: string;
  line1: string;
  line2: string;
  postal: string;
  saving: boolean;
  errorMsg: string;
  onClose: () => void;
  onCityChange: (v: string) => void;
  onDistrictChange: (v: string) => void;
  onLine1Change: (v: string) => void;
  onLine2Change: (v: string) => void;
  onPostalChange: (v: string) => void;
  onSubmit: () => void;
}) {
  const {
    open,
    mode,
    cities,
    districts,
    cityId,
    districtId,
    line1,
    line2,
    postal,
    saving,
    errorMsg,
    onClose,
    onCityChange,
    onDistrictChange,
    onLine1Change,
    onLine2Change,
    onPostalChange,
    onSubmit,
  } = props;

  if (!open) return null;

  return (
    <div className="mk-maddr-sheet">
      <button
        type="button"
        aria-label="إغلاق"
        onClick={saving ? undefined : onClose}
        className="mk-maddr-sheet__overlay"
      />

      <div dir="rtl" className="mk-maddr-sheet__panel">
        <div className="mk-maddr-sheet__handleWrap">
          <div className="mk-maddr-sheet__handle" />
        </div>

        <div className="mk-maddr-sheet__inner">
          <div className="mk-maddr-sheet__head">
            <div>
              <div className="mk-maddr-sheet__title">
                {mode === "edit" ? "تعديل العنوان" : "إضافة عنوان"}
              </div>

              <div className="mk-maddr-sheet__desc">
                احفظ عنوانك لاستخدامه لاحقًا بسهولة
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="mk-maddr-btn mk-maddr-btn--soft"
            >
              إغلاق
            </button>
          </div>

          <div className="mk-maddr-form">
            <Field label="المدينة">
              <select
                value={cityId}
                onChange={(e) => onCityChange(e.target.value)}
                disabled={saving}
                className="mk-maddr-input"
              >
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {s(c.name_ar || c.name_en)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="الحي">
              <select
                value={districtId}
                onChange={(e) => onDistrictChange(e.target.value)}
                disabled={saving || !cityId}
                className="mk-maddr-input"
              >
                <option value="">اختر الحي</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {s(d.name_ar || d.name_en)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="العنوان">
              <input
                value={line1}
                onChange={(e) => onLine1Change(e.target.value)}
                disabled={saving}
                placeholder="مثال: حي الملك فهد، شارع الأمير..."
                className="mk-maddr-input"
              />
            </Field>

            <Field label="تفاصيل إضافية">
              <input
                value={line2}
                onChange={(e) => onLine2Change(e.target.value)}
                disabled={saving}
                placeholder="شقة، دور، علامة مميزة..."
                className="mk-maddr-input"
              />
            </Field>

            <Field label="الرمز البريدي">
              <input
                value={postal}
                onChange={(e) => onPostalChange(e.target.value)}
                disabled={saving}
                placeholder="اختياري"
                className="mk-maddr-input"
              />
            </Field>

            {errorMsg ? (
              <div className="mk-maddr-alert mk-maddr-alert--error">
                {errorMsg}
              </div>
            ) : null}

            <button
              type="button"
              onClick={onSubmit}
              disabled={saving || !cityId || !line1.trim()}
              className="mk-maddr-btn mk-maddr-btn--primary mk-maddr-btn--full"
            >
              {saving
                ? "جاري الحفظ..."
                : mode === "edit"
                  ? "حفظ التعديل"
                  : "حفظ العنوان"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteSheet({
  open,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="mk-maddr-sheet">
      <button
        type="button"
        aria-label="إغلاق"
        onClick={busy ? undefined : onClose}
        className="mk-maddr-sheet__overlay"
      />

      <div dir="rtl" className="mk-maddr-delete">
        <div className="mk-maddr-delete__handleWrap">
          <div className="mk-maddr-sheet__handle" />
        </div>

        <div className="mk-maddr-delete__icon">!</div>

        <div className="mk-maddr-delete__title">حذف العنوان</div>

        <div className="mk-maddr-delete__text">
          هل أنت متأكد من حذف هذا العنوان؟ لن تتمكن من استعادته بعد الحذف.
        </div>

        <div className="mk-maddr-delete__actions">
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="mk-maddr-btn mk-maddr-btn--danger mk-maddr-btn--full"
          >
            {busy ? "جاري الحذف..." : "نعم، احذف"}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="mk-maddr-btn mk-maddr-btn--soft mk-maddr-btn--full"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AddressesMobileScreen() {
  const [state, setState] = useState<State>({ kind: "loading" });

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState("");

  const [cityId, setCityId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [postal, setPostal] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteId, setDeleteId] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  const districtReqSeq = useRef(0);

  async function loadAddresses(opts?: { keepForm?: boolean }) {
    setState({ kind: "loading" });

    try {
      const r = await fetch("/api/checkout/addresses", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });

      const j = await safeJson(r);

      if (isLoginRequired(r, j)) {
        setAddresses([]);
        setState({ kind: "unauth" });
        return;
      }

      if (!r.ok || !j?.ok) {
        setState({
          kind: "error",
          message: s(j?.error) || "تعذر تحميل العناوين",
        });
        return;
      }

      const list: Address[] = Array.isArray(j?.addresses) ? j.addresses : [];
      setAddresses(list);
      setState({ kind: "ready" });

      if (!opts?.keepForm && list.length === 0) {
        openCreateForm();
      }
    } catch (e: any) {
      setState({
        kind: "error",
        message: s(e?.message) || "تعذر تحميل العناوين",
      });
    }
  }

  async function loadCities() {
    const r = await fetch("/api/ref/cities", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });

    const j = await safeJson(r);
    const list: City[] = Array.isArray(j?.cities) ? j.cities : [];

    setCities(list);

    if (!cityId && list[0]?.id) {
      setCityId(String(list[0].id));
    }
  }

  async function loadDistricts(nextCityId: string) {
    const seq = ++districtReqSeq.current;

    if (!nextCityId) {
      setDistricts([]);
      setDistrictId("");
      return;
    }

    const r = await fetch(
      `/api/ref/districts?city_id=${encodeURIComponent(nextCityId)}`,
      {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      },
    );

    const j = await safeJson(r);
    if (seq !== districtReqSeq.current) return;

    const list: District[] = Array.isArray(j?.districts) ? j.districts : [];
    setDistricts(list);

    if (districtId && list.some((d) => String(d.id) === String(districtId))) {
      return;
    }

    if (list[0]?.id) setDistrictId(String(list[0].id));
    else setDistrictId("");
  }

  useEffect(() => {
    void loadAddresses();
  }, []);

  useEffect(() => {
    const onAuthChanged = () => {
      void loadAddresses({ keepForm: true });
    };

    window.addEventListener("auth:changed", onAuthChanged);
    return () => window.removeEventListener("auth:changed", onAuthChanged);
  }, []);

  useEffect(() => {
    if (!showForm) return;
    setFormError("");
    void loadCities();
  }, [showForm]);

  useEffect(() => {
    if (!showForm) return;
    void loadDistricts(cityId);
  }, [cityId, showForm]);

  function resetFormForCreate() {
    setMode("create");
    setEditingId("");
    setFormError("");
    setLine1("");
    setLine2("");
    setPostal("");
    setDistrictId("");
  }

  function openCreateForm() {
    resetFormForCreate();
    setShowForm(true);
  }

  function openEditForm(a: Address) {
    setMode("edit");
    setEditingId(String(a.id));
    setFormError("");

    const nextCity = s(a.city_id);
    const nextDistrict = s(a.district_id);

    setCityId(nextCity || cityId || "");
    setDistrictId(nextDistrict || "");
    setLine1(s(a.address_line1) || "");
    setLine2(s(a.address_line2) || "");
    setPostal(s(a.postal_code) || "");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setSaving(false);
    setFormError("");
    setEditingId("");
    setMode("create");
  }

  function openDeleteModal(id: string) {
    setDeleteId(id);
  }

  function closeDeleteModal() {
    if (deleteBusy) return;
    setDeleteId("");
  }

  async function handleDelete() {
    if (!deleteId) return;

    setDeleteBusy(true);

    try {
      const r = await fetch(
        `/api/checkout/addresses?id=${encodeURIComponent(deleteId)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
        },
      );

      const j = await safeJson(r);

      if (isLoginRequired(r, j)) {
        closeDeleteModal();
        openAuthModal();
        return;
      }

      if (!r.ok || !j?.ok) {
        alert("تعذر حذف العنوان");
        return;
      }

      closeDeleteModal();
      await loadAddresses({ keepForm: true });
    } catch {
      alert("تعذر حذف العنوان");
    } finally {
      setDeleteBusy(false);
    }
  }

  async function submitForm() {
    if (!cityId || !line1.trim()) return;

    setSaving(true);
    setFormError("");

    try {
      const payload = {
        city_id: cityId,
        district_id: districtId || null,
        address_line1: line1,
        address_line2: line2 || null,
        postal_code: postal || null,
      };

      const r =
        mode === "edit"
          ? await fetch("/api/checkout/addresses", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              credentials: "same-origin",
              body: JSON.stringify({ id: editingId, ...payload }),
            })
          : await fetch("/api/checkout/addresses", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "same-origin",
              body: JSON.stringify(payload),
            });

      const j = await safeJson(r);

      if (isLoginRequired(r, j)) {
        setFormError("");
        openAuthModal();
        return;
      }

      if (!r.ok || !j?.ok) {
        const raw = s(j?.message_ar) || s(j?.error);
        setFormError(
          raw || (mode === "edit" ? "تعذر تحديث العنوان" : "تعذر حفظ العنوان"),
        );
        return;
      }

      await loadAddresses({ keepForm: true });
      closeForm();
    } finally {
      setSaving(false);
    }
  }

  const hasAddresses = useMemo(() => addresses.length > 0, [addresses]);

  return (
    <AccountMobileLayout active="addresses" title="عناويني">
      <DeleteSheet
        open={Boolean(deleteId)}
        busy={deleteBusy}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
      />

      <AddressFormSheet
        open={showForm}
        mode={mode}
        cities={cities}
        districts={districts}
        cityId={cityId}
        districtId={districtId}
        line1={line1}
        line2={line2}
        postal={postal}
        saving={saving}
        errorMsg={formError}
        onClose={closeForm}
        onCityChange={setCityId}
        onDistrictChange={setDistrictId}
        onLine1Change={setLine1}
        onLine2Change={setLine2}
        onPostalChange={setPostal}
        onSubmit={submitForm}
      />

      <div className="mk-maddr-top">
        <div className="mk-maddr-top__desc">إدارة العناوين المحفوظة</div>

        <button
          type="button"
          onClick={() => {
            if (state.kind === "unauth") {
              openAuthModal();
              return;
            }

            openCreateForm();
          }}
          className="mk-maddr-btn mk-maddr-btn--primary"
        >
          إضافة عنوان
        </button>
      </div>

      {state.kind === "loading" ? (
        <div className="mk-maddr-state">جاري تحميل العناوين...</div>
      ) : state.kind === "unauth" ? (
        <div className="mk-maddr-state mk-maddr-state--column">
          <div>لازم تسجل دخول عشان تشوف عناوينك.</div>

          <button
            type="button"
            onClick={openAuthModal}
            className="mk-maddr-btn mk-maddr-btn--primary mk-maddr-btn--full"
          >
            تسجيل الدخول
          </button>
        </div>
      ) : state.kind === "error" ? (
        <div className="mk-maddr-state mk-maddr-state--error">
          {state.message}
        </div>
      ) : !hasAddresses ? (
        <div className="mk-maddr-empty">لا توجد عناوين محفوظة</div>
      ) : (
        <div className="mk-maddr-list">
          {addresses.map((a) => (
            <div key={a.id} className="mk-maddr-card">
              <div className="mk-maddr-card__head">
                <div className="mk-maddr-card__main">
                  <div className="mk-maddr-card__titleRow">
                    <div className="mk-maddr-card__title">{a.label}</div>

                    {a.national ? (
                      <span className="mk-maddr-card__national">
                        {a.national}
                      </span>
                    ) : null}
                  </div>

                  <div className="mk-maddr-card__full">{a.full}</div>

                  {a.recipient_name || a.phone_e164 ? (
                    <div className="mk-maddr-card__contact">
                      {[s(a.recipient_name), s(a.phone_e164)]
                        .filter(Boolean)
                        .join(" — ")}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mk-maddr-card__actions">
                <button
                  type="button"
                  onClick={() => openEditForm(a)}
                  className="mk-maddr-btn mk-maddr-btn--soft mk-maddr-btn--full"
                >
                  تعديل
                </button>

                <button
                  type="button"
                  onClick={() => openDeleteModal(a.id)}
                  className="mk-maddr-btn mk-maddr-btn--outlineDanger mk-maddr-btn--full"
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AccountMobileLayout>
  );
}