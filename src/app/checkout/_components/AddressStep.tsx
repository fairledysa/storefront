// FILE: apps/storefront/src/app/checkout/_components/AddressStep.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import StepShell from "./StepShell";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
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

let citiesCache: City[] | null = null;
let citiesPromise: Promise<City[]> | null = null;

const districtsCache = new Map<string, District[]>();
const districtsPromise = new Map<string, Promise<District[]>>();

type FormMode = "create" | "edit";

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
    headers: {
      "Cache-Control": "no-store",
    },
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
      headers: {
        "Cache-Control": "no-store",
      },
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

function NewAddressForm(props: {
  isActive: boolean;
  mode: FormMode;
  title?: string;

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
  const {
    isActive,
    mode,
    title,
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

  const formDisabled = !isActive || saving;

  return (
    <div className="rounded-[22px] border border-zinc-200 bg-white p-3 shadow-[0_10px_26px_rgba(15,23,42,0.035)] sm:rounded-[24px] sm:p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 text-right">
          <div className="text-sm font-black text-zinc-950">
            {title ?? (mode === "edit" ? "تعديل العنوان" : "إضافة عنوان جديد")}
          </div>

          <div className="mt-0.5 text-[12px] leading-5 text-zinc-500">
            اكتب العنوان بوضوح حتى تصل الشحنة بدون تأخير.
          </div>
        </div>

        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            className="h-8 shrink-0 rounded-full border-zinc-200 bg-white px-3 text-xs font-black text-zinc-800 shadow-sm hover:bg-zinc-50 sm:h-9 sm:rounded-2xl sm:text-sm"
            onClick={onCancel}
            disabled={formDisabled}
          >
            <X className="h-4 w-4" />
            <span className="ms-2 hidden sm:inline">إلغاء</span>
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <select
          className="h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 text-right text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/10 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
          disabled={formDisabled || cities.length === 0}
          value={cityId}
          onChange={(e) => onCityChange(e.target.value)}
        >
          {cities.length === 0 ? (
            <option value="">جاري تحميل المدن...</option>
          ) : null}

          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {s(c.name_ar || c.name_en)}
            </option>
          ))}
        </select>

        <select
          className="h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 text-right text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/10 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
          disabled={formDisabled || !cityId}
          value={districtId}
          onChange={(e) => onDistrictChange(e.target.value)}
        >
          <option value="">اختر الحي</option>

          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {s(d.name_ar || d.name_en)}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2">
        <Input
          placeholder="اسم الشارع أو أقرب معلم"
          value={line1}
          onChange={(e) => onLine1Change(e.target.value)}
          className="h-11 rounded-2xl border-zinc-200 bg-zinc-50 text-right text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-950/10"
          disabled={formDisabled}
        />

        <Input
          placeholder="رقم المبنى / تفاصيل إضافية"
          value={line2}
          onChange={(e) => onLine2Change(e.target.value)}
          className="h-11 rounded-2xl border-zinc-200 bg-zinc-50 text-right text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-950/10"
          disabled={formDisabled}
        />

        <Input
          placeholder="الرمز البريدي، إن وجد"
          value={postal}
          onChange={(e) => onPostalChange(e.target.value)}
          className="h-11 rounded-2xl border-zinc-200 bg-zinc-50 text-right text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-950/10"
          disabled={formDisabled}
          dir="ltr"
        />
      </div>

      {errorMsg ? (
        <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-right text-[13px] leading-6 text-red-700">
          {errorMsg}
        </div>
      ) : null}

      <Button
        className="mt-3 h-11 w-full rounded-[18px] bg-zinc-950 text-[14px] font-black text-white shadow-[0_12px_28px_rgba(15,23,42,0.14)] transition hover:bg-zinc-800 active:scale-[0.99] disabled:bg-zinc-200 disabled:text-zinc-400 disabled:shadow-none sm:h-12 sm:rounded-[20px] sm:text-[15px]"
        disabled={formDisabled || !cityId || !line1.trim()}
        onClick={onSubmit}
        type="button"
      >
        <span className="inline-flex items-center justify-center gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}

          {saving
            ? "جاري الحفظ..."
            : mode === "edit"
              ? "حفظ التعديل"
              : "حفظ واستخدام العنوان"}
        </span>
      </Button>
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
        headers: {
          "Cache-Control": "no-store",
        },
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
    if (confirmedId) {
      setValue(confirmedId);
    }
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

    return () => {
      window.removeEventListener("auth:changed", onAuthChanged);
    };
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

      if (exists) {
        return prev.map((x) => (String(x.id) === id ? address : x));
      }

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
        const raw = s(j?.message_ar) || s(j?.error);
        const msg =
          raw || (mode === "edit" ? "تعذر تحديث العنوان" : "تعذر حفظ العنوان");
        setFormError(msg);
        return;
      }

      const updatedId = String(j?.address?.id || "");
      const updatedAddress = j?.address as Address | undefined;

      if (updatedId && updatedAddress?.id) {
        upsertAddressLocally(updatedAddress);
        setValue(updatedId);
        closeForm();

        setConfirming(true);

        try {
          const result = await onConfirm(updatedId);
          pushSummary((result as ConfirmResult | null)?.summary ?? null);
        } finally {
          if (mountedRef.current) {
            setConfirming(false);
          }
        }

        void loadAddresses({ keepForm: true });
        return;
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
          if (mountedRef.current) {
            setConfirming(false);
          }
        }
      } else {
        closeForm();
      }
    } finally {
      if (mountedRef.current) {
        setSaving(false);
      }
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
      if (mountedRef.current) {
        setConfirming(false);
      }
    }
  }

  if (isDone && picked) {
    return (
      <StepShell
        title="عنوان الشحن"
        subtitle="تم اختيار العنوان — يمكنك تعديله قبل إتمام الطلب"
        icon={<MapPin className="h-5 w-5 text-zinc-800" />}
        isActive={isActive}
        isDone
        onEdit={confirming ? undefined : onEdit}
      >
        <div className="rounded-[18px] border border-amber-700/25 bg-[#fffaf1] px-3 py-3 sm:rounded-[22px] sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-black text-zinc-950">
              {picked.label}
            </div>

            <span className="rounded-full border border-amber-900/15 bg-white px-2 py-0.5 text-[11px] font-black text-stone-700 sm:text-[12px]">
              محدد
            </span>

            {picked.national ? (
              <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-500 sm:text-[12px]">
                {picked.national}
              </span>
            ) : null}
          </div>

          <div className="mt-1 text-[12px] leading-6 text-zinc-500 sm:text-[13px]">
            {picked.full}
          </div>
        </div>
      </StepShell>
    );
  }

  if (loading && addresses.length === 0) {
    return (
      <StepShell
        title="عنوان الشحن"
        subtitle="اختر عنوانًا محفوظًا أو أضف عنوانًا جديدًا"
        icon={<MapPin className="h-5 w-5 text-zinc-800" />}
        isActive={isActive}
        isDone={false}
        isLocked={false}
        rightChip={<span>الخطوة 1</span>}
      >
        <div className="space-y-2">
          <AddressSkeleton />
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
        icon={<MapPin className="h-5 w-5 text-zinc-800" />}
        isActive={isActive && !confirming}
        isDone={false}
        isLocked={false}
        rightChip={<span>الخطوة 1</span>}
      >
        <NewAddressForm
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
      icon={<MapPin className="h-5 w-5 text-zinc-800" />}
      isActive={isActive && !confirming}
      isDone={false}
      isLocked={false}
      rightChip={<span>الخطوة 1</span>}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث باسم الحي أو الشارع"
            className="h-10 rounded-2xl border-zinc-200 bg-white pr-9 text-right text-[13px] text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-950/10 sm:h-11 sm:text-sm"
            disabled={!isActive || confirming}
          />
        </div>

        <Button
          variant="outline"
          className="h-10 shrink-0 rounded-2xl border-zinc-200 bg-white px-3 text-[13px] font-black text-zinc-800 shadow-sm hover:bg-zinc-50 sm:h-11 sm:px-4 sm:text-sm"
          disabled={!isActive || confirming}
          onClick={openCreateForm}
          type="button"
        >
          <Plus className="h-4 w-4" />
          <span className="ms-1.5 sm:ms-2">إضافة</span>
          <span className="hidden sm:inline"> عنوان</span>
        </Button>
      </div>

      {showForm ? (
        <div className="mt-3 sm:mt-4">
          <NewAddressForm
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
          <div className="mt-3 sm:mt-4">
            {visibleAddresses.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-center sm:rounded-[22px]">
                <div className="text-sm font-black text-zinc-800">
                  لا توجد نتائج مطابقة
                </div>

                <div className="mt-1 text-[13px] text-zinc-500">
                  جرّب البحث باسم الحي أو أضف عنوانًا جديدًا.
                </div>
              </div>
            ) : (
              <RadioGroup
                value={value}
                onValueChange={(next) => {
                  if (!isActive || confirming || saving) return;
                  setValue(next);
                  setConfirmError("");
                  setSubmitEnabled(false);
                }}
                className="space-y-2"
                disabled={!isActive || confirming || saving}
              >
                {visibleAddresses.map((a) => {
                  const selected = String(a.id) === String(value);
                  const inputId = `checkout-address-${a.id}`;

                  return (
                    <div
                      key={a.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (!isActive || confirming || saving) return;
                        setValue(a.id);
                        setConfirmError("");
                        setSubmitEnabled(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();

                          if (!isActive || confirming || saving) return;
                          setValue(a.id);
                          setConfirmError("");
                          setSubmitEnabled(false);
                        }
                      }}
                      className={[
                        "group rounded-[18px] border px-3 py-3 text-right transition active:scale-[0.997]",
                        "sm:rounded-[22px] sm:px-4 sm:py-4",
                        confirming || saving ? "pointer-events-none opacity-80" : "",
                        selected
                          ? "border-amber-700/30 bg-[#fffaf1] shadow-none sm:shadow-[0_12px_32px_rgba(15,23,42,0.055)]"
                          : "border-zinc-200 bg-white hover:bg-zinc-50",
                      ].join(" ")}
                    >
                      <div className="relative min-h-[50px] pr-9 pl-[46px] sm:pr-10 sm:pl-[92px]">
                        <RadioGroupItem
                          id={inputId}
                          value={a.id}
                          className="absolute right-0 top-1 shrink-0 border-zinc-300 text-zinc-950"
                        />

                        <Button
                          type="button"
                          variant="outline"
                          className="absolute left-0 top-0 h-8 w-8 rounded-full border-zinc-200 bg-white p-0 text-zinc-800 shadow-sm transition hover:bg-zinc-50 sm:h-9 sm:w-auto sm:rounded-2xl sm:px-3"
                          disabled={!isActive || confirming || saving}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openEditForm(a);
                          }}
                          aria-label="تعديل العنوان"
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="ms-2 hidden sm:inline">تعديل</span>
                        </Button>

                        <label
                          htmlFor={inputId}
                          className="block min-w-0 cursor-pointer text-right"
                        >
                          <div
                            dir="rtl"
                            className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2"
                          >
                            <span className="hidden h-8 w-8 shrink-0 place-items-center rounded-2xl border border-zinc-200 bg-white text-zinc-700 sm:grid">
                              <MapPin className="h-4 w-4" />
                            </span>

                            <div className="min-w-0 max-w-full truncate text-sm font-black text-zinc-950">
                              {a.label}
                            </div>

                            {selected ? (
                              <span className="shrink-0 rounded-full border border-amber-900/15 bg-white px-2 py-0.5 text-[11px] font-black text-stone-700 sm:text-[12px]">
                                محدد
                              </span>
                            ) : null}

                            {a.national ? (
                              <span className="shrink-0 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-500 sm:bg-zinc-50 sm:text-[12px]">
                                {a.national}
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-1.5 line-clamp-2 text-right text-[12px] leading-5 text-zinc-500 sm:mt-2 sm:text-[13px] sm:leading-6">
                            {a.full}
                          </div>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </RadioGroup>
            )}
          </div>

          {confirmError ? (
            <div className="mt-3 rounded-2xl border border-red-500/15 bg-red-500/5 px-3 py-2 text-center text-[12px] leading-5 text-red-700">
              {confirmError}
            </div>
          ) : null}

          <Button
            className="mt-3 h-11 w-full rounded-[18px] bg-zinc-950 text-[14px] font-black text-white shadow-[0_12px_28px_rgba(15,23,42,0.14)] transition hover:bg-zinc-800 active:scale-[0.99] disabled:bg-zinc-200 disabled:text-zinc-400 disabled:shadow-none sm:mt-4 sm:h-12 sm:rounded-[20px] sm:text-[15px]"
            disabled={!isActive || confirming || saving || !value}
            onClick={confirmCurrentAddress}
            type="button"
          >
            <span className="inline-flex items-center justify-center gap-2">
              {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {confirming ? "جاري تأكيد العنوان..." : "تأكيد العنوان"}
            </span>
          </Button>
        </>
      )}
    </StepShell>
  );
}

function AddressSkeleton() {
  return (
    <div className="rounded-[18px] border border-zinc-200 bg-white px-3 py-3 sm:rounded-[22px] sm:px-4 sm:py-4">
      <div className="flex items-start gap-3">
        <div className="h-5 w-5 animate-pulse rounded-full bg-zinc-100" />

        <div className="min-w-0 flex-1">
          <div className="h-4 w-32 animate-pulse rounded-full bg-zinc-100" />
          <div className="mt-2 h-3 w-56 max-w-full animate-pulse rounded-full bg-zinc-100" />
        </div>

        <div className="h-8 w-8 animate-pulse rounded-full bg-zinc-100" />
      </div>
    </div>
  );
}