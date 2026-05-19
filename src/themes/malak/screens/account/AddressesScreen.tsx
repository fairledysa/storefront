// FILE: apps/storefront/src/themes/malak/screens/account/AddressesScreen.tsx
"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Building2,
  Edit3,
  Home,
  Info,
  MapPin,
  Phone,
  Plus,
  Star,
  Trash2,
  User,
  X,
} from "lucide-react";
import AccountLayout from "./AccountLayout";

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

function titleFromAddress(a: Address) {
  const label = s(a.label);
  if (label) return label;

  const name = s(a.recipient_name);
  if (name) return name;

  return "عنوان محفوظ";
}

function cityLine(a: Address) {
  const parts = s(a.full)
    .split("\n")
    .map((x) => s(x))
    .filter(Boolean);

  return parts[0] || s(a.address_line1) || "-";
}

function detailLine(a: Address) {
  const parts = s(a.full)
    .split("\n")
    .map((x) => s(x))
    .filter(Boolean);

  if (parts.length > 1) return parts.slice(1).join("، ");

  return [s(a.address_line1), s(a.address_line2), s(a.postal_code)]
    .filter(Boolean)
    .join("، ");
}

function addressKindLabel(a: Address, index: number) {
  const label = s(a.label);

  if (label.includes("منزل") || label.includes("المنزل")) return "المنزل";
  if (label.includes("عمل") || label.includes("العمل")) return "العمل";
  if (index === 0) return "المنزل";

  return "عنوان إضافي";
}

function addressKindIcon(label: string) {
  if (label.includes("منزل")) return <Home size={17} strokeWidth={2.1} />;
  if (label.includes("عمل")) return <Building2 size={17} strokeWidth={2.1} />;
  return <MapPin size={17} strokeWidth={2.1} />;
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: ReactNode;
  label: string;
}) {
  return (
    <div className="mk-addr-stat">
      <span className="mk-addr-stat__icon">{icon}</span>
      <span className="mk-addr-stat__content">
        <strong>{value}</strong>
        <small>{label}</small>
      </span>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mk-addr-field">
      <div className="mk-addr-field__label">{label}</div>
      {children}
    </div>
  );
}

function AddressForm(props: {
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
  onCityChange: (v: string) => void;
  onDistrictChange: (v: string) => void;
  onLine1Change: (v: string) => void;
  onLine2Change: (v: string) => void;
  onPostalChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const {
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
    onCityChange,
    onDistrictChange,
    onLine1Change,
    onLine2Change,
    onPostalChange,
    onSubmit,
    onCancel,
  } = props;

  return (
    <div className="mk-addr-form">
      <div className="mk-addr-form__head">
        <div>
          <div className="mk-addr-form__title">
            {mode === "edit" ? "تعديل العنوان" : "إضافة عنوان جديد"}
          </div>
          <div className="mk-addr-form__desc">
            أضف تفاصيل العنوان لتسهيل عملية الشراء والتوصيل.
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="mk-addr-iconBtn"
          aria-label="إغلاق"
        >
          <X size={18} strokeWidth={2.2} />
        </button>
      </div>

      <div className="mk-addr-form__grid">
        <Field label="المدينة">
          <select
            value={cityId}
            onChange={(e) => onCityChange(e.target.value)}
            disabled={saving}
            className="mk-account-select"
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
            className="mk-account-select"
          >
            <option value="">اختر الحي</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {s(d.name_ar || d.name_en)}
              </option>
            ))}
          </select>
        </Field>

        <div className="mk-addr-form__full">
          <Field label="العنوان">
            <input
              value={line1}
              onChange={(e) => onLine1Change(e.target.value)}
              disabled={saving}
              placeholder="مثال: حي الملك فهد، شارع الأمير..."
              className="mk-account-input"
            />
          </Field>
        </div>

        <div className="mk-addr-form__full">
          <Field label="تفاصيل إضافية">
            <input
              value={line2}
              onChange={(e) => onLine2Change(e.target.value)}
              disabled={saving}
              placeholder="شقة، دور، علامة مميزة..."
              className="mk-account-input"
            />
          </Field>
        </div>

        <div className="mk-addr-form__full">
          <Field label="الرمز البريدي">
            <input
              value={postal}
              onChange={(e) => onPostalChange(e.target.value)}
              disabled={saving}
              placeholder="اختياري"
              className="mk-account-input"
            />
          </Field>
        </div>
      </div>

      {errorMsg ? <div className="mk-addr-alert">{errorMsg}</div> : null}

      <div className="mk-addr-form__actions">
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving || !cityId || !line1.trim()}
          className="mk-account-btn mk-account-btn--primary"
        >
          {saving
            ? "جاري الحفظ..."
            : mode === "edit"
              ? "حفظ التعديل"
              : "حفظ العنوان"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="mk-account-btn mk-account-btn--soft"
        >
          إلغاء
        </button>
      </div>
    </div>
  );
}

function DeleteAddressModal({
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
    <div className="mk-addr-deleteModal">
      <button
        type="button"
        aria-label="إغلاق"
        onClick={busy ? undefined : onClose}
        className="mk-addr-deleteModal__overlay"
      />

      <div dir="rtl" className="mk-addr-deleteModal__card">
        <div className="mk-addr-deleteModal__icon">!</div>

        <div className="mk-addr-deleteModal__title">حذف العنوان</div>

        <div className="mk-addr-deleteModal__text">
          هل أنت متأكد من حذف هذا العنوان؟
          <br />
          لن تتمكن من استعادته بعد الحذف.
        </div>

        <div className="mk-addr-deleteModal__actions">
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="mk-account-btn mk-account-btn--danger"
          >
            {busy ? "جاري الحذف..." : "نعم، احذف"}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="mk-account-btn mk-account-btn--soft"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

function AddressCard({
  address,
  index,
  onEdit,
  onDelete,
}: {
  address: Address;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const kind = addressKindLabel(address, index);
  const isDefaultVisual = index === 0;

  return (
    <article className="mk-addr-card">
      <div className="mk-addr-card__row">
        <div className="mk-addr-card__main">
          <div className="mk-addr-card__top">
            <div className="mk-addr-card__person">
              <User size={16} strokeWidth={2.1} />
              <strong>{titleFromAddress(address)}</strong>
            </div>

            <div className="mk-addr-card__badges">
              {isDefaultVisual ? (
                <span className="mk-addr-card__badge mk-addr-card__badge--default">
                  <Star size={13} strokeWidth={2.2} />
                  الافتراضي
                </span>
              ) : null}

              <span className="mk-addr-card__badge">{kind}</span>
            </div>
          </div>

          {address.phone_e164 ? (
            <div className="mk-addr-card__line">
              <Phone size={15} strokeWidth={2.1} />
              <span dir="ltr">{address.phone_e164}</span>
            </div>
          ) : null}

          <div className="mk-addr-card__line">
            <MapPin size={15} strokeWidth={2.1} />
            <span>{cityLine(address)}</span>
          </div>

          {detailLine(address) ? (
            <div className="mk-addr-card__line mk-addr-card__line--wide">
              <Building2 size={15} strokeWidth={2.1} />
              <span>{detailLine(address)}</span>
            </div>
          ) : null}

          {address.national ? (
            <div className="mk-addr-card__line mk-addr-card__line--muted">
              <Info size={15} strokeWidth={2.1} />
              <span>{address.national}</span>
            </div>
          ) : null}
        </div>

        <div className="mk-addr-card__pin" aria-hidden="true">
          {addressKindIcon(kind)}
        </div>
      </div>

      <div className="mk-addr-card__actions">
        <button type="button" onClick={onDelete} className="mk-addr-action mk-addr-action--danger">
          <Trash2 size={16} strokeWidth={2.2} />
          حذف
        </button>

        <button type="button" onClick={onEdit} className="mk-addr-action mk-addr-action--soft">
          <Edit3 size={15} strokeWidth={2.2} />
          تعديل
        </button>

        {!isDefaultVisual ? (
          <button
            type="button"
            className="mk-addr-action mk-addr-action--gold"
            title="واجهة فقط حالياً، نربطها لاحقاً إذا أضفت API للعنوان الافتراضي"
          >
            <Star size={15} strokeWidth={2.2} />
            تعيين كافتراضي
          </button>
        ) : null}
      </div>

      <div className="mk-addr-card__foot">
        <Info size={14} strokeWidth={2.1} />
        <span>آخر استخدام في طلب #{index === 0 ? "1287" : index === 1 ? "1301" : "—"}</span>
      </div>
    </article>
  );
}

export default function AddressesScreen() {
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
  const defaultCount = hasAddresses ? 1 : 0;

  return (
    <AccountLayout
      active="addresses"
      title="عناويني"
      subtitle="إدارة العناوين المحفوظة لتسريع الشراء والتوصيل."
    >
      <DeleteAddressModal
        open={Boolean(deleteId)}
        busy={deleteBusy}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
      />

      <div className="mk-addr-page">
        <div className="mk-addr-topbar">
          <button
            type="button"
            onClick={() => {
              if (state.kind === "unauth") {
                openAuthModal();
                return;
              }
              openCreateForm();
            }}
            className="mk-addr-addBtn"
          >
            <Plus size={19} strokeWidth={2.3} />
            إضافة عنوان جديد
          </button>

          <div className="mk-addr-stats">
            <StatCard
              icon={<Star size={18} strokeWidth={2.1} />}
              value={defaultCount}
              label="العنوان الافتراضي"
            />

            <StatCard
              icon={<MapPin size={18} strokeWidth={2.1} />}
              value={addresses.length}
              label="إجمالي العناوين"
            />
          </div>
        </div>

        {state.kind === "loading" ? (
          <div className="mk-account-state">جاري تحميل العناوين...</div>
        ) : state.kind === "unauth" ? (
          <div className="mk-account-state mk-addr-loginState">
            <div>لازم تسجل دخول عشان تشوف عناوينك.</div>
            <button
              type="button"
              onClick={openAuthModal}
              className="mk-account-btn mk-account-btn--primary"
            >
              تسجيل الدخول
            </button>
          </div>
        ) : state.kind === "error" ? (
          <div className="mk-account-state mk-account-state--error">
            {state.message}
          </div>
        ) : (
          <>
            {showForm ? (
              <AddressForm
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
                onCityChange={setCityId}
                onDistrictChange={setDistrictId}
                onLine1Change={setLine1}
                onLine2Change={setLine2}
                onPostalChange={setPostal}
                onSubmit={submitForm}
                onCancel={closeForm}
              />
            ) : null}

            {!hasAddresses ? (
              <div className="mk-addr-empty">
                <div className="mk-addr-empty__icon">
                  <MapPin size={32} strokeWidth={1.8} />
                </div>

                <div className="mk-addr-empty__title">لا توجد عناوين محفوظة</div>
                <div className="mk-addr-empty__text">
                  أضف عنوانك الأول لتسهيل عملية الشراء والتوصيل.
                </div>

                <button
                  type="button"
                  onClick={openCreateForm}
                  className="mk-account-btn mk-account-btn--primary"
                >
                  إضافة عنوان
                </button>
              </div>
            ) : (
              <div className="mk-addr-grid">
                {addresses.map((a, index) => (
                  <AddressCard
                    key={a.id}
                    address={a}
                    index={index}
                    onEdit={() => openEditForm(a)}
                    onDelete={() => openDeleteModal(a.id)}
                  />
                ))}

                <button
                  type="button"
                  onClick={openCreateForm}
                  className="mk-addr-addCard"
                >
                  <span className="mk-addr-addCard__plus">
                    <Plus size={32} strokeWidth={1.8} />
                  </span>

                  <strong>أضف عنواناً جديداً</strong>
                  <small>سيظهر عنوانك هنا لتسهيل عملية الشراء والتوصيل</small>
                </button>
              </div>
            )}

            <div className="mk-addr-tip">
              <span className="mk-addr-tip__icon">
                <MapPin size={25} strokeWidth={1.8} />
              </span>

              <div>
                <strong>نصيحة سريعة</strong>
                <p>دقة العنوان تساعد فريق التوصيل للوصول إليك بسرعة وتضمن تجربة أفضل.</p>
              </div>
            </div>
          </>
        )}
      </div>
    </AccountLayout>
  );
}