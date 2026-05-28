// FILE: apps/storefront/src/app/checkout/_components/AddressStep.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import StepShell from "./StepShell";
import { Loader2, MapPin, Pencil, Plus, Search, X } from "lucide-react";

type Address = {
  id: string;
  label: string;
  full: string;
  national?: string | null;
  city_id?: string | null;
  district_id?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  postal_code?: string | null;
};

type City = { id: string; name_ar: string; name_en?: string | null };
type District = { id: string; name_ar: string; name_en?: string | null };

type ConfirmResult = {
  ok?: boolean;
  summary?: any;
  cart?: any;
  order?: any;
  state?: any;
};

type FormMode = "create" | "edit";

let citiesCache: City[] | null = null;
let citiesPromise: Promise<City[]> | null = null;

const districtsCache = new Map<string, District[]>();
const districtsPromise = new Map<string, Promise<District[]>>();

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

function dispatchCheckoutEvent(name: string, detail?: any) {
  if (typeof window === "undefined") return;

  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent(name, detail ? { detail } : undefined));
  }, 0);
}

function pushSummary(summary: any) {
  if (summary) {
    dispatchCheckoutEvent("checkout:summaryPatch", {
      summary,
      reconcile: false,
    });
  } else {
    dispatchCheckoutEvent("checkout:refresh");
  }
}

function setSubmitEnabled(enabled: boolean) {
  dispatchCheckoutEvent("checkout:submitEnabled", { enabled });
}

async function fetchCitiesOnce(): Promise<City[]> {
  if (citiesCache) return citiesCache;
  if (citiesPromise) return citiesPromise;

  citiesPromise = fetch("/api/ref/cities", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Cache-Control": "no-store" },
  })
    .then(async (r) => {
      const j = await safeJson(r);
      const list: City[] = Array.isArray(j?.cities) ? j.cities : [];
      citiesCache = list;
      return list;
    })
    .catch(() => {
      citiesCache = [];
      return [];
    })
    .finally(() => {
      citiesPromise = null;
    });

  return citiesPromise;
}

async function fetchDistrictsOnce(cityId: string): Promise<District[]> {
  const cleanCityId = s(cityId);
  if (!cleanCityId) return [];

  const cached = districtsCache.get(cleanCityId);
  if (cached) return cached;

  const pending = districtsPromise.get(cleanCityId);
  if (pending) return pending;

  const promise = fetch(
    `/api/ref/districts?city_id=${encodeURIComponent(cleanCityId)}`,
    {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Cache-Control": "no-store" },
    },
  )
    .then(async (r) => {
      const j = await safeJson(r);
      const list: District[] = Array.isArray(j?.districts) ? j.districts : [];
      districtsCache.set(cleanCityId, list);
      return list;
    })
    .catch(() => {
      districtsCache.set(cleanCityId, []);
      return [];
    })
    .finally(() => {
      districtsPromise.delete(cleanCityId);
    });

  districtsPromise.set(cleanCityId, promise);
  return promise;
}

function buildAddressLine(address?: Address | null) {
  if (!address) return "تم حفظ عنوان الشحن لهذا الطلب.";

  const parts = [address.national, address.full]
    .map((part) => s(part))
    .filter(Boolean);

  return parts.length ? parts.join(" - ") : "تم حفظ عنوان الشحن لهذا الطلب.";
}

function AddressForm(props: {
  isActive: boolean;
  mode: FormMode;
  cities: City[];
  districts: District[];
  cityId: string;
  districtId: string;
  line1: string;
  line2: string;
  postal: string;
  saving: boolean;
  errorMsg?: string;
  onCityChange: (v: string) => void;
  onDistrictChange: (v: string) => void;
  onLine1Change: (v: string) => void;
  onLine2Change: (v: string) => void;
  onPostalChange: (v: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
}) {
  const formDisabled = !props.isActive || props.saving;

  return (
    <div className="co-address-form">
      <div className="co-form-head">
        <div>
          <strong>
            {props.mode === "edit" ? "تعديل العنوان" : "إضافة عنوان جديد"}
          </strong>
          <p>اكتب العنوان بوضوح حتى تصل الشحنة بدون تأخير.</p>
        </div>

        {props.onCancel ? (
          <button
            type="button"
            className="co-mini-action"
            onClick={props.onCancel}
            disabled={formDisabled}
          >
            <X size={15} />
            إلغاء
          </button>
        ) : null}
      </div>

      <div className="co-form-grid co-form-grid--2">
        <select
          className="co-field"
          disabled={formDisabled || props.cities.length === 0}
          value={props.cityId}
          onChange={(e) => props.onCityChange(e.target.value)}
        >
          {props.cities.length === 0 ? (
            <option value="">جاري تحميل المدن...</option>
          ) : null}

          {props.cities.map((c) => (
            <option key={c.id} value={c.id}>
              {s(c.name_ar || c.name_en)}
            </option>
          ))}
        </select>

        <select
          className="co-field"
          disabled={formDisabled || !props.cityId}
          value={props.districtId}
          onChange={(e) => props.onDistrictChange(e.target.value)}
        >
          <option value="">اختر الحي</option>

          {props.districts.map((d) => (
            <option key={d.id} value={d.id}>
              {s(d.name_ar || d.name_en)}
            </option>
          ))}
        </select>
      </div>

      <div className="co-form-grid">
        <input
          className="co-field"
          placeholder="اسم الشارع أو أقرب معلم"
          value={props.line1}
          onChange={(e) => props.onLine1Change(e.target.value)}
          disabled={formDisabled}
        />

        <input
          className="co-field"
          placeholder="رقم المبنى / تفاصيل إضافية"
          value={props.line2}
          onChange={(e) => props.onLine2Change(e.target.value)}
          disabled={formDisabled}
        />

        <input
          className="co-field"
          placeholder="الرمز البريدي، إن وجد"
          value={props.postal}
          onChange={(e) => props.onPostalChange(e.target.value)}
          disabled={formDisabled}
          dir="ltr"
        />
      </div>

      {props.errorMsg ? (
        <div className="co-field-error">{props.errorMsg}</div>
      ) : null}

      <button
        className="co-btn co-btn--dark co-btn--full"
        disabled={formDisabled || !props.cityId || !props.line1.trim()}
        onClick={props.onSubmit}
        type="button"
      >
        {props.saving ? <Loader2 size={16} className="co-spin" /> : null}
        {props.saving
          ? "جاري الحفظ..."
          : props.mode === "edit"
            ? "حفظ التعديل"
            : "حفظ واستخدام العنوان"}
      </button>
    </div>
  );
}

export default function AddressStep(props: {
  isActive: boolean;
  isDone: boolean;
  confirmedId?: string;
  onEdit: () => void;
  onConfirm: (addressId: string) => void | Promise<ConfirmResult | null | void>;
}) {
  const { isActive, isDone, confirmedId, onEdit, onConfirm } = props;

  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [value, setValue] = useState<string>(confirmedId ?? "");
  const [query, setQuery] = useState("");

  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState<string>("");

  const [cityId, setCityId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [postal, setPostal] = useState("");

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>("");
  const [confirmError, setConfirmError] = useState<string>("");

  const mountedRef = useRef(true);
  const addressReqSeq = useRef(0);
  const districtReqSeq = useRef(0);

  const picked = useMemo(() => {
    const id = confirmedId ?? value;
    return addresses.find((x) => String(x.id) === String(id));
  }, [confirmedId, value, addresses]);

  const visibleAddresses = useMemo(() => {
    const q = s(query).toLowerCase();
    if (!q) return addresses;

    return addresses.filter((a) => {
      const haystack = [
        a.label,
        a.full,
        a.national,
        a.address_line1,
        a.address_line2,
      ]
        .map((x) => s(x).toLowerCase())
        .join(" ");

      return haystack.includes(q);
    });
  }, [addresses, query]);

  async function loadAddresses(opts?: { keepForm?: boolean }) {
    const seq = ++addressReqSeq.current;

    setLoading(true);

    try {
      const r = await fetch("/api/checkout/addresses", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Cache-Control": "no-store" },
      });

      const j = await safeJson(r);

      if (!mountedRef.current || seq !== addressReqSeq.current) return;

      if (isLoginRequired(r, j)) {
        setAddresses([]);
        setValue("");

        if (!opts?.keepForm) {
          setShowForm(true);
          setMode("create");
        }

        return;
      }

      const list: Address[] = Array.isArray(j?.addresses) ? j.addresses : [];
      setAddresses(list);

      setValue((current) => {
        if (confirmedId) return confirmedId;

        if (current && list.some((a) => String(a.id) === String(current))) {
          return current;
        }

        return list[0]?.id ? String(list[0].id) : "";
      });

      if (!opts?.keepForm) {
        if (list.length === 0) {
          setMode("create");
          setEditingId("");
          setShowForm(true);
        } else {
          setShowForm(false);
        }
      }
    } finally {
      if (mountedRef.current && seq === addressReqSeq.current) {
        setLoading(false);
      }
    }
  }

  async function loadCities() {
    const list = await fetchCitiesOnce();

    if (!mountedRef.current) return;

    setCities(list);

    setCityId((current) => {
      if (current) return current;
      return list[0]?.id ? String(list[0].id) : "";
    });
  }

  async function loadDistricts(nextCityId: string) {
    const cleanCityId = s(nextCityId);
    const seq = ++districtReqSeq.current;

    if (!cleanCityId) {
      setDistricts([]);
      setDistrictId("");
      return;
    }

    const list = await fetchDistrictsOnce(cleanCityId);

    if (!mountedRef.current || seq !== districtReqSeq.current) return;

    setDistricts(list);

    setDistrictId((current) => {
      if (current && list.some((d) => String(d.id) === String(current))) {
        return current;
      }

      return list[0]?.id ? String(list[0].id) : "";
    });
  }

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      addressReqSeq.current += 1;
      districtReqSeq.current += 1;
    };
  }, []);

  useEffect(() => {
    if (confirmedId) setValue(confirmedId);
  }, [confirmedId]);

  useEffect(() => {
    void loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onAuthChanged = () => {
      void loadAddresses({ keepForm: true });
    };

    window.addEventListener("auth:changed", onAuthChanged);
    return () => window.removeEventListener("auth:changed", onAuthChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!showForm) return;

    setFormError("");
    void loadCities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showForm]);

  useEffect(() => {
    if (!showForm) return;

    void loadDistricts(cityId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!isActive || confirming) return;

    resetFormForCreate();
    setShowForm(true);
  }

  function openEditForm(a: Address) {
    if (!isActive || confirming) return;

    setMode("edit");
    setEditingId(String(a.id));
    setFormError("");

    setCityId(s(a.city_id) || cityId || "");
    setDistrictId(s(a.district_id) || "");
    setLine1(s(a.address_line1) || "");
    setLine2(s(a.address_line2) || "");
    setPostal(s(a.postal_code) || "");

    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setFormError("");
    setEditingId("");
    setMode("create");
  }

  function upsertAddressLocally(address: Address) {
    const id = s(address?.id);
    if (!id) return;

    setAddresses((prev) => {
      const exists = prev.some((x) => String(x.id) === id);
      if (exists) return prev.map((x) => (String(x.id) === id ? address : x));
      return [address, ...prev];
    });
  }

  async function submitForm() {
    if (!cityId || !line1.trim() || saving) return;

    setSaving(true);
    setFormError("");
    setConfirmError("");

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
              cache: "no-store",
              body: JSON.stringify({ id: editingId, ...payload }),
            })
          : await fetch("/api/checkout/addresses", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "same-origin",
              cache: "no-store",
              body: JSON.stringify(payload),
            });

      const j = await safeJson(r);

      if (!mountedRef.current) return;

      if (isLoginRequired(r, j)) {
        setFormError("");
        openAuthModal();
        return;
      }

      if (!r.ok || !j?.ok) {
        setFormError(
          s(j?.message_ar) ||
            s(j?.error) ||
            (mode === "edit" ? "تعذر تحديث العنوان" : "تعذر حفظ العنوان"),
        );
        return;
      }

      const updatedId = String(j?.address?.id || "");
      const updatedAddress = j?.address as Address | undefined;

      if (updatedId && updatedAddress?.id) {
        upsertAddressLocally(updatedAddress);
      }

      await loadAddresses({ keepForm: true });

      if (updatedId) {
        setValue(updatedId);
        closeForm();

        setConfirming(true);

        try {
          const result = await onConfirm(updatedId);
          pushSummary((result as ConfirmResult | null)?.summary ?? null);
        } finally {
          if (mountedRef.current) setConfirming(false);
        }
      } else {
        closeForm();
      }
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }

  async function confirmCurrentAddress() {
    if (!isActive || confirming || saving || !value) return;

    setConfirming(true);
    setConfirmError("");
    setSubmitEnabled(false);

    try {
      const result = await onConfirm(value);
      pushSummary((result as ConfirmResult | null)?.summary ?? null);
    } catch (e: any) {
      setConfirmError(e?.message || "تعذر تأكيد العنوان. حاول مرة أخرى.");
    } finally {
      if (mountedRef.current) setConfirming(false);
    }
  }

  if (isDone) {
    return (
      <section className="co-salla-saved-step" aria-label="عنوان التوصيل">
        <div className="co-salla-saved-row">
          <div className="co-salla-saved-row__main">
            <MapPin size={20} className="co-salla-saved-row__icon" />

            <div className="co-salla-saved-row__content">
              <h2>عنوان التوصيل</h2>

              <p>
                <strong>{s(picked?.label) || "عنوان محفوظ"}</strong>
                <span> - {buildAddressLine(picked)}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            className="co-salla-saved-row__edit"
            onClick={onEdit}
            disabled={confirming}
          >
            <Pencil size={14} />
            تعديل
          </button>
        </div>
      </section>
    );
  }

  if (loading && addresses.length === 0) {
    return (
      <StepShell
        title="عنوان الشحن"
        subtitle="اختر عنوانًا محفوظًا أو أضف عنوانًا جديدًا"
        icon={<MapPin size={18} />}
        isActive={isActive}
        isDone={false}
        isLocked={false}
        rightChip={<span>العنوان</span>}
      >
        <div className="co-options-list">
          <AddressSkeleton />
          <AddressSkeleton />
        </div>
      </StepShell>
    );
  }

  if (!loading && addresses.length === 0) {
    return (
      <StepShell
        title="عنوان الشحن"
        subtitle="أضف عنوانك مرة واحدة لاستخدامه في الطلب"
        icon={<MapPin size={18} />}
        isActive={isActive && !confirming}
        isDone={false}
        isLocked={false}
        rightChip={<span>العنوان</span>}
      >
        <AddressForm
          isActive={isActive && !confirming}
          mode="create"
          cities={cities}
          districts={districts}
          cityId={cityId}
          districtId={districtId}
          line1={line1}
          line2={line2}
          postal={postal}
          saving={saving || confirming}
          errorMsg={formError}
          onCityChange={setCityId}
          onDistrictChange={setDistrictId}
          onLine1Change={setLine1}
          onLine2Change={setLine2}
          onPostalChange={setPostal}
          onSubmit={submitForm}
        />
      </StepShell>
    );
  }

  return (
    <StepShell
      title="عنوان الشحن"
      subtitle="اختر عنوانًا محفوظًا أو أضف عنوانًا جديدًا"
      icon={<MapPin size={18} />}
      isActive={isActive && !confirming}
      isDone={false}
      isLocked={false}
      rightChip={<span>العنوان</span>}
    >
      <div className="co-address-tools">
        <div className="co-search-field">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث باسم الحي أو الشارع"
            disabled={!isActive || confirming}
          />
        </div>

        <button
          className="co-mini-action co-mini-action--dark"
          disabled={!isActive || confirming}
          onClick={openCreateForm}
          type="button"
        >
          <Plus size={15} />
          إضافة عنوان
        </button>
      </div>

      {showForm ? (
        <div className="co-form-wrap">
          <AddressForm
            isActive={isActive && !confirming}
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
        </div>
      ) : (
        <>
          <div className="co-address-list">
            {visibleAddresses.length === 0 ? (
              <div className="co-empty-small">
                <strong>لا توجد نتائج مطابقة</strong>
                <span>جرّب البحث باسم الحي أو أضف عنوانًا جديدًا.</span>
              </div>
            ) : (
              visibleAddresses.map((a) => {
                const selected = String(a.id) === String(value);

                return (
                  <div
                    key={a.id}
                    role="button"
                    tabIndex={0}
                    className={[
                      "co-address-row",
                      selected ? "is-selected" : "",
                      confirming || saving ? "is-disabled" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => {
                      if (!isActive || confirming || saving) return;
                      setValue(a.id);
                      setConfirmError("");
                      setSubmitEnabled(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();

                      if (!isActive || confirming || saving) return;
                      setValue(a.id);
                      setConfirmError("");
                      setSubmitEnabled(false);
                    }}
                  >
                    <span className="co-address-radio">
                      {selected ? "✓" : ""}
                    </span>

                    <div className="co-address-main">
                      <div className="co-address-title">
                        <strong>{a.label}</strong>

                        {selected ? <span>محدد</span> : null}

                        {a.national ? <em>{a.national}</em> : null}
                      </div>

                      <p>{a.full}</p>
                    </div>

                    <button
                      type="button"
                      className="co-mini-action"
                      disabled={!isActive || confirming || saving}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openEditForm(a);
                      }}
                    >
                      <Pencil size={14} />
                      تعديل
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {confirmError ? (
            <div className="co-field-error">{confirmError}</div>
          ) : null}

          <button
            className="co-btn co-btn--dark co-btn--full"
            disabled={!isActive || confirming || saving || !value}
            onClick={confirmCurrentAddress}
            type="button"
          >
            {confirming ? <Loader2 size={16} className="co-spin" /> : null}
            {confirming ? "جاري تأكيد العنوان..." : "تأكيد العنوان"}
          </button>
        </>
      )}
    </StepShell>
  );
}

function AddressSkeleton() {
  return (
    <div className="co-address-row is-skeleton">
      <span className="co-skeleton co-skeleton--radio" />
      <div className="co-address-main">
        <span className="co-skeleton co-skeleton--title" />
        <span className="co-skeleton co-skeleton--line" />
      </div>
    </div>
  );
}