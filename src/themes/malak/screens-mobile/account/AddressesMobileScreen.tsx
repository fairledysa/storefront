// FILE: apps/storefront/src/themes/malak/screens-mobile/account/AddressesMobileScreen.tsx
"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
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

function titleFromAddress(a: Address) {
  return s(a.label) || s(a.recipient_name) || "عنوان محفوظ";
}

function splitFull(a: Address) {
  return s(a.full)
    .split("\n")
    .map((x) => s(x))
    .filter(Boolean);
}

function cityLine(a: Address) {
  return splitFull(a)[0] || s(a.address_line1) || "-";
}

function detailLine(a: Address) {
  const parts = splitFull(a);
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

function AddressKindIcon({ label }: { label: string }) {
  if (label.includes("منزل")) return <Home size={17} strokeWidth={2.1} />;
  if (label.includes("عمل")) return <Building2 size={17} strokeWidth={2.1} />;
  return <MapPin size={17} strokeWidth={2.1} />;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mk-maddr-field">
      <span className="mk-maddr-field__label">{label}</span>
      {children}
    </label>
  );
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
    <div className="mk-maddr-stat">
      <span className="mk-maddr-stat__icon">{icon}</span>
      <span>
        <strong>{value}</strong>
        <small>{label}</small>
      </span>
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
  if (!props.open) return null;

  return (
    <div className="mk-maddr-sheet" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="إغلاق"
        onClick={props.saving ? undefined : props.onClose}
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
                {props.mode === "edit" ? "تعديل العنوان" : "إضافة عنوان جديد"}
              </div>
              <div className="mk-maddr-sheet__desc">
                أضف تفاصيل العنوان لتسهيل عملية الشراء والتوصيل.
              </div>
            </div>

            <button
              type="button"
              onClick={props.onClose}
              disabled={props.saving}
              className="mk-maddr-iconBtn"
              aria-label="إغلاق"
            >
              <X size={18} strokeWidth={2.2} />
            </button>
          </div>

          <div className="mk-maddr-form">
            <Field label="المدينة">
              <select
                value={props.cityId}
                onChange={(e) => props.onCityChange(e.target.value)}
                disabled={props.saving}
                className="mk-maddr-input"
              >
                {props.cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {s(c.name_ar || c.name_en)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="الحي">
              <select
                value={props.districtId}
                onChange={(e) => props.onDistrictChange(e.target.value)}
                disabled={props.saving || !props.cityId}
                className="mk-maddr-input"
              >
                <option value="">اختر الحي</option>
                {props.districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {s(d.name_ar || d.name_en)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="العنوان">
              <input
                value={props.line1}
                onChange={(e) => props.onLine1Change(e.target.value)}
                disabled={props.saving}
                placeholder="مثال: حي الملك فهد، شارع الأمير..."
                className="mk-maddr-input"
              />
            </Field>

            <Field label="تفاصيل إضافية">
              <input
                value={props.line2}
                onChange={(e) => props.onLine2Change(e.target.value)}
                disabled={props.saving}
                placeholder="شقة، دور، علامة مميزة..."
                className="mk-maddr-input"
              />
            </Field>

            <Field label="الرمز البريدي">
              <input
                value={props.postal}
                onChange={(e) => props.onPostalChange(e.target.value)}
                disabled={props.saving}
                placeholder="اختياري"
                className="mk-maddr-input"
              />
            </Field>

            {props.errorMsg ? (
              <div className="mk-maddr-alert mk-maddr-alert--error">
                {props.errorMsg}
              </div>
            ) : null}

            <div className="mk-maddr-sheet__actions">
              <button
                type="button"
                onClick={props.onSubmit}
                disabled={props.saving || !props.cityId || !props.line1.trim()}
                className="mk-maddr-btn mk-maddr-btn--primary mk-maddr-btn--full"
              >
                {props.saving
                  ? "جاري الحفظ..."
                  : props.mode === "edit"
                    ? "حفظ التعديل"
                    : "حفظ العنوان"}
              </button>

              <button
                type="button"
                onClick={props.onClose}
                disabled={props.saving}
                className="mk-maddr-btn mk-maddr-btn--soft mk-maddr-btn--full"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteSheet({
  open,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  busy: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="mk-maddr-sheet" role="dialog" aria-modal="true">
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

        {error ? <div className="mk-maddr-alert mk-maddr-alert--error">{error}</div> : null}

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
  const details = detailLine(address);
  const lastOrderNo = index === 0 ? "1287" : index === 1 ? "1301" : "";

  return (
    <article className="mk-maddr-card">
      <div className="mk-maddr-card__head">
        <div className="mk-maddr-card__main">
          <div className="mk-maddr-card__titleRow">
            <div className="mk-maddr-card__title">
              <User size={16} strokeWidth={2.1} />
              <strong>{titleFromAddress(address)}</strong>
            </div>
          </div>

          <div className="mk-maddr-card__badges">
            {isDefaultVisual ? (
              <span className="mk-maddr-card__badge mk-maddr-card__badge--default">
                <Star size={13} strokeWidth={2.2} />
                الافتراضي
              </span>
            ) : null}
            <span className="mk-maddr-card__badge">{kind}</span>
          </div>
        </div>

        <div className="mk-maddr-card__pin" aria-hidden="true">
          <AddressKindIcon label={kind} />
        </div>
      </div>

      <div className="mk-maddr-card__content">
        {address.recipient_name ? (
          <div className="mk-maddr-card__line">
            <User size={15} strokeWidth={2.1} />
            <span>{address.recipient_name}</span>
          </div>
        ) : null}

        {address.phone_e164 ? (
          <div className="mk-maddr-card__line">
            <Phone size={15} strokeWidth={2.1} />
            <span dir="ltr">{address.phone_e164}</span>
          </div>
        ) : null}

        <div className="mk-maddr-card__line">
          <MapPin size={15} strokeWidth={2.1} />
          <span>{cityLine(address)}</span>
        </div>

        {details ? (
          <div className="mk-maddr-card__line">
            <Building2 size={15} strokeWidth={2.1} />
            <span>{details}</span>
          </div>
        ) : null}

        {address.national ? (
          <div className="mk-maddr-card__line mk-maddr-card__line--muted">
            <Info size={15} strokeWidth={2.1} />
            <span>{address.national}</span>
          </div>
        ) : null}
      </div>

      <div className="mk-maddr-card__actions">
        <button
          type="button"
          onClick={onEdit}
          className="mk-maddr-btn mk-maddr-btn--soft mk-maddr-btn--full"
        >
          <Edit3 size={15} strokeWidth={2.2} />
          تعديل
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="mk-maddr-btn mk-maddr-btn--outlineDanger mk-maddr-btn--full"
        >
          <Trash2 size={16} strokeWidth={2.2} />
          حذف
        </button>
      </div>

      {!isDefaultVisual ? (
        <div className="mk-maddr-card__defaultNote">
          <Star size={14} strokeWidth={2.1} />
          <span>تعيين الافتراضي غير مربوط في نسخة الكمبيوتر الحالية.</span>
        </div>
      ) : null}

      {lastOrderNo ? (
        <div className="mk-maddr-card__lastOrder">
          <div className="mk-maddr-card__lastOrderMeta">
            <span className="mk-maddr-card__lastOrderLabel">
            آخر استخدام في طلب
            </span>

            <Link
              href={`/account/orders/${lastOrderNo}`}
              className="mk-maddr-card__lastOrderNumber"
              dir="ltr"
            >
              #{lastOrderNo}
            </Link>
          </div>
        </div>
      ) : null}

      <div className="mk-maddr-card__lastOrderLegacy" aria-hidden="true">
        <span className="mk-maddr-card__lastOrderLabel">
          <Info size={14} strokeWidth={2.1} />
          آخر استخدام في طلب
        </span>
        <span>
          آخر استخدام في طلب #{index === 0 ? "1287" : index === 1 ? "1301" : "-"}
        </span>
        {lastOrderNo ? (
          <Link
            href={`/account/orders/${lastOrderNo}`}
            className="mk-maddr-card__lastOrderLink"
            dir="ltr"
          >
            #{lastOrderNo}
          </Link>
        ) : (
          <span className="mk-maddr-card__lastOrderLink is-disabled" dir="ltr">
            -
          </span>
        )}
      </div>
    </article>
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
  const [deleteError, setDeleteError] = useState("");

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

      if (!opts?.keepForm && list.length === 0) openCreateForm();
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
    if (!cityId && list[0]?.id) setCityId(String(list[0].id));
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

    setDistrictId(list[0]?.id ? String(list[0].id) : "");
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
    setCityId(s(a.city_id) || cityId || "");
    setDistrictId(s(a.district_id) || "");
    setLine1(s(a.address_line1));
    setLine2(s(a.address_line2));
    setPostal(s(a.postal_code));
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setSaving(false);
    setFormError("");
    setEditingId("");
    setMode("create");
  }

  function openDeleteSheet(id: string) {
    setDeleteError("");
    setDeleteId(id);
  }

  function closeDeleteSheet() {
    if (deleteBusy) return;
    setDeleteId("");
    setDeleteError("");
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleteBusy(true);
    setDeleteError("");

    try {
      const r = await fetch(
        `/api/checkout/addresses?id=${encodeURIComponent(deleteId)}`,
        { method: "DELETE", credentials: "same-origin" },
      );
      const j = await safeJson(r);

      if (isLoginRequired(r, j)) {
        closeDeleteSheet();
        openAuthModal();
        return;
      }

      if (!r.ok || !j?.ok) {
        setDeleteError("تعذر حذف العنوان");
        return;
      }

      closeDeleteSheet();
      await loadAddresses({ keepForm: true });
    } catch {
      setDeleteError("تعذر حذف العنوان");
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

      const r = await fetch("/api/checkout/addresses", {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(
          mode === "edit" ? { id: editingId, ...payload } : payload,
        ),
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
          raw ||
            (mode === "edit"
              ? "تعذر تحديث العنوان"
              : "تعذر حفظ العنوان"),
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
    <AccountMobileLayout active="addresses" title="عناويني">
      <DeleteSheet
        open={Boolean(deleteId)}
        busy={deleteBusy}
        error={deleteError}
        onClose={closeDeleteSheet}
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

      <section className="mk-maddr-page">
        <div className="mk-maddr-hero">
          <div>
            <h2>عناويني</h2>
            <p>إدارة العناوين المحفوظة لتسريع الشراء والتوصيل.</p>
          </div>

          <button
            type="button"
            onClick={() =>
              state.kind === "unauth" ? openAuthModal() : openCreateForm()
            }
            className="mk-maddr-btn mk-maddr-btn--primary"
          >
            <Plus size={17} strokeWidth={2.3} />
            إضافة عنوان
          </button>
        </div>

        <div className="mk-maddr-stats">
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
          <div className="mk-maddr-state mk-maddr-state--column mk-maddr-state--error">
            <div>{state.message}</div>
            <button
              type="button"
              onClick={() => void loadAddresses({ keepForm: true })}
              className="mk-maddr-btn mk-maddr-btn--soft mk-maddr-btn--full"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : !hasAddresses ? (
          <div className="mk-maddr-empty">
            <MapPin size={32} strokeWidth={1.8} />
            <strong>لا توجد عناوين محفوظة</strong>
            <span>
              أضف عنوانك الأول لتسهيل عملية الشراء والتوصيل.
            </span>
            <button
              type="button"
              onClick={openCreateForm}
              className="mk-maddr-btn mk-maddr-btn--primary mk-maddr-btn--full"
            >
              إضافة عنوان
            </button>
          </div>
        ) : (
          <>
            <div className="mk-maddr-list">
              {addresses.map((a, index) => (
                <AddressCard
                  key={a.id}
                  address={a}
                  index={index}
                  onEdit={() => openEditForm(a)}
                  onDelete={() => openDeleteSheet(a.id)}
                />
              ))}

              <button
                type="button"
                onClick={openCreateForm}
                className="mk-maddr-addCard"
              >
                <Plus size={30} strokeWidth={1.8} />
                <strong>أضف عنوانًا جديدًا</strong>
                <small>
                  سيظهر عنوانك هنا لتسهيل عملية الشراء والتوصيل.
                </small>
              </button>
            </div>

            <div className="mk-maddr-tip">
              <MapPin size={24} strokeWidth={1.8} />
              <div>
                <strong>نصيحة سريعة</strong>
                <p>
                  دقة العنوان تساعد فريق التوصيل للوصول إليك بسرعة وتضمن تجربة أفضل.
                </p>
              </div>
            </div>
          </>
        )}
      </section>
    </AccountMobileLayout>
  );
}
