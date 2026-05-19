// FILE: apps/storefront/src/app/(store)/_components/auth/AuthModal.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

function isEmail(v: string) {
  return v.includes("@");
}

function needsOnboarding(customer: any) {
  if (!customer) return true;
  // ✅ نضيف full_name ضمن النواقص
  return (
    !customer.full_name ||
    !customer.birth_date ||
    !customer.gender ||
    !customer.city_id
  );
}

type City = { id: string; name_ar: string; name_en: string };

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export default function AuthModal({
  open,
  onClose,
  onAuthed,
}: {
  open: boolean;
  onClose: () => void;
  onAuthed: () => void;
}) {
  // -------------------------
  // state
  // -------------------------
  const [step, setStep] = useState<"enter" | "code" | "onboarding">("enter");
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState("");
  const [kind, setKind] = useState<"email" | "phone">("phone");

  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", ""]);
  const otpValue = otpDigits.join("");
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  // ✅ NEW: اسم المستخدم
  const [fullName, setFullName] = useState("");

  const [birthDate, setBirthDate] = useState(""); // YYYY-MM-DD
  const [gender, setGender] = useState<"" | "male" | "female">("");
  const [cityId, setCityId] = useState("");

  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);

  const [cityOpen, setCityOpen] = useState(false);
  const [cityQuery, setCityQuery] = useState("");

  const cityBtnRef = useRef<HTMLButtonElement | null>(null);
  const citySearchRef = useRef<HTMLInputElement | null>(null);

  const [by, setBy] = useState<number | "">("");
  const [bm, setBm] = useState<number | "">("");
  const [bd, setBd] = useState<number | "">("");

  // UX messages
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  // Resend OTP timer
  const [resendIn, setResendIn] = useState<number>(0); // seconds

  // -------------------------
  // memos (مهم: لازم قبل أي return!)
  // -------------------------
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
      const ar = (c.name_ar || "").toLowerCase();
      const en = (c.name_en || "").toLowerCase();
      return ar.includes(q) || en.includes(q);
    });
  }, [cities, cityQuery]);

  // -------------------------
  // effects
  // -------------------------
  useEffect(() => {
    if (!open) {
      setStep("enter");
      setLoading(false);
      setTarget("");
      setKind("phone");
      setOtpDigits(["", "", "", ""]);

      setFullName(""); // ✅ NEW

      setBirthDate("");
      setGender("");
      setCityId("");

      setCities([]);
      setCitiesLoading(false);

      setCityOpen(false);
      setCityQuery("");

      setBy("");
      setBm("");
      setBd("");

      setErrorMsg("");
      setSuccessMsg("");

      setResendIn(0);
    }
  }, [open]);

  useEffect(() => {
    if (open && step === "code") {
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    }
  }, [open, step]);

  // countdown for resend
  useEffect(() => {
    if (!open) return;
    if (resendIn <= 0) return;

    const t = setInterval(() => {
      setResendIn((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    return () => clearInterval(t);
  }, [open, resendIn]);

  // تحميل المدن عند onboarding
  useEffect(() => {
    if (!open || step !== "onboarding") return;

    let cancelled = false;

    (async () => {
      setCitiesLoading(true);
      try {
        const res = await fetch("/api/ref/cities", {
          cache: "no-store",
          credentials: "include",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(json?.message || json?.error || "CITIES_FAILED");
        if (!cancelled) setCities(json?.cities || []);
      } catch (e: any) {
        if (!cancelled) setErrorMsg(e?.message || "تعذر تحميل المدن");
      } finally {
        if (!cancelled) setCitiesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, step]);

  // تكوين birthDate من 3 قوائم
  useEffect(() => {
    if (!by || !bm || !bd) {
      setBirthDate("");
      return;
    }
    setBirthDate(`${by}-${pad2(Number(bm))}-${pad2(Number(bd))}`);
  }, [by, bm, bd]);

  // فتح قائمة المدن -> فوكس البحث
  useEffect(() => {
    if (!cityOpen) {
      setCityQuery("");
      return;
    }
    setTimeout(() => citySearchRef.current?.focus(), 0);
  }, [cityOpen]);

  // اغلاق قائمة المدن عند الضغط خارج
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!cityOpen) return;
      const t = e.target as HTMLElement;
      const box = document.getElementById("city-popover");
      if (!box) return;
      if (box.contains(t) || cityBtnRef.current?.contains(t as any)) return;
      setCityOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [cityOpen]);

  // -------------------------
  // helpers
  // -------------------------
  function setError(message: string) {
    setSuccessMsg("");
    setErrorMsg(message);
  }
  function setSuccess(message: string) {
    setErrorMsg("");
    setSuccessMsg(message);
  }

  // ✅ مهم: تفعيل merge السلة فور تسجيل الدخول
  async function syncCartAfterLogin() {
    try {
      await fetch("/api/cart", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });
    } catch {
      // لا نوقف تسجيل الدخول لو فشل
    }
  }

  // -------------------------
  // handlers
  // -------------------------
  async function sendOtp(opts?: { silent?: boolean }) {
    const v = target.trim();
    if (!v) return;

    setLoading(true);
    if (!opts?.silent) {
      setErrorMsg("");
      setSuccessMsg("");
    }

    try {
      const k = isEmail(v) ? "email" : "phone";
      setKind(k);

      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ target: v }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json?.message || json?.error || "OTP_SEND_FAILED");

      setOtpDigits(["", "", "", ""]);
      setStep("code");

      // Start resend countdown (مثل سلة)
      setResendIn(60);
      setSuccess("تم إرسال رمز التحقق ✅");
    } catch (e: any) {
      setError(e?.message || "تعذر إرسال رمز التحقق");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          kind,
          target: target.trim(),
          token: otpValue.trim(),
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json?.message || json?.error || "OTP_VERIFY_FAILED");

      // ✅ قبل أي إغلاق/تحديث UI: فعّل merge السلة فورًا
      await syncCartAfterLogin();

      onAuthed();
      setSuccess("تم تسجيل الدخول ✅");

      const meRes = await fetch("/api/auth/me", {
        cache: "no-store",
        credentials: "include",
      });
      const me = await meRes.json().catch(() => ({}));

      // ✅ لو الاسم موجود نعبّيه تلقائيًا
      if (me?.authed && me?.customer?.full_name && !fullName.trim()) {
        setFullName(String(me.customer.full_name || "").trim());
      }

      if (me?.authed && needsOnboarding(me?.customer)) {
        setStep("onboarding");
      } else {
        onClose();
      }
    } catch (e: any) {
      setError(e?.message || "رمز التحقق غير صحيح");
    } finally {
      setLoading(false);
    }
  }

  async function submitOnboarding() {
    if (!fullName.trim() || !birthDate || !gender || !cityId) {
      setError("فضلاً أكمل البيانات (الاسم + تاريخ الميلاد + الجنس + المدينة)");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const payload = {
        full_name: fullName.trim(), // ✅ NEW
        birth_date: birthDate,
        gender,
        city_id: cityId,
      };

      const res = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          json?.message || json?.error || "ONBOARDING_UPDATE_FAILED",
        );
      }

      const meRes = await fetch("/api/auth/me", {
        cache: "no-store",
        credentials: "include",
      });
      const me = await meRes.json().catch(() => ({}));

      if (!me?.authed) throw new Error("UNAUTHENTICATED");

      if (needsOnboarding(me?.customer)) {
        setError("تم الحفظ، لكن باقي بيانات ناقصة. تأكد من المدخلات.");
        return;
      }

      // ✅ بعد إكمال onboarding: فعّل merge/تأكيد السلة مرة ثانية
      await syncCartAfterLogin();

      setSuccess("تم حفظ بياناتك ✅");
      onAuthed();
      onClose();
    } catch (e: any) {
      setError(e?.message || "تعذر حفظ البيانات");
    } finally {
      setLoading(false);
    }
  }

  function setDigit(i: number, val: string) {
    const d = val.replace(/\D/g, "").slice(0, 1);
    setOtpDigits((prev) => {
      const next = [...prev];
      next[i] = d;
      return next;
    });
    if (d && i < 3) otpRefs.current[i + 1]?.focus();
  }

  function handleOtpKeyDown(
    i: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (e.key === "Backspace") {
      if (otpDigits[i]) {
        setOtpDigits((prev) => {
          const next = [...prev];
          next[i] = "";
          return next;
        });
      } else if (i > 0) {
        otpRefs.current[i - 1]?.focus();
        setOtpDigits((prev) => {
          const next = [...prev];
          next[i - 1] = "";
          return next;
        });
      }
    }
    if (e.key === "ArrowLeft" && i > 0) otpRefs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 3) otpRefs.current[i + 1]?.focus();
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (!text) return;
    e.preventDefault();

    const arr = text.split("");
    setOtpDigits([arr[0] || "", arr[1] || "", arr[2] || "", arr[3] || ""]);

    const idx = Math.min(text.length - 1, 3);
    setTimeout(() => otpRefs.current[idx]?.focus(), 0);
  }

  // -------------------------
  // ✅ IMPORTANT: return after hooks only
  // -------------------------
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute left-1/2 top-16 w-[min(92vw,520px)] -translate-x-1/2 rounded-2xl bg-white p-5 shadow-xl">
        <div
          className="mb-3 flex items-start justify-between gap-4 rounded-xl px-3 py-3"
          style={{ background: "rgba(0,0,0,0.02)" }} // ✅ خلفية خفيفة للعنوان
        >
          <div className="text-lg font-semibold text-slate-900">
            {step === "enter"
              ? "تسجيل الدخول"
              : step === "code"
                ? "أدخل رمز التحقق"
                : "إكمال البيانات"}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        {errorMsg ? (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMsg}
          </div>
        ) : null}

        {successMsg ? (
          <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {successMsg}
          </div>
        ) : null}

        {step === "enter" ? (
          <div className="space-y-3">
            <div className="text-sm text-slate-600">
              أدخل البريد الإلكتروني وسيصلك رمز تحقق مكون من 4 أرقام.
            </div>

            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="email@example.com"
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
            />

            <button
              disabled={loading || !target.trim()}
              onClick={() => sendOtp()}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "جاري الإرسال..." : "إرسال الرمز"}
            </button>
          </div>
        ) : null}

        {step === "code" ? (
          <div className="space-y-4">
            <div className="text-sm text-slate-600">
              تم إرسال رمز التحقق إلى:{" "}
              <span className="font-semibold">{target}</span>
            </div>

            <div dir="ltr" className="flex justify-center gap-3">
              {otpDigits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    otpRefs.current[i] = el;
                  }}
                  value={d}
                  onChange={(e) => setDigit(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  onPaste={handleOtpPaste}
                  inputMode="numeric"
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  className="h-14 w-14 rounded-xl border text-center text-xl font-semibold outline-none focus:border-slate-900"
                />
              ))}
            </div>

            <button
              disabled={loading || otpValue.length !== 4}
              onClick={verifyOtp}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "جاري التحقق..." : "تأكيد"}
            </button>

            <button
              type="button"
              disabled={loading || resendIn > 0}
              onClick={() => sendOtp({ silent: true })}
              className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-60"
            >
              {resendIn > 0
                ? `إعادة الإرسال بعد ${resendIn}ث`
                : "إعادة إرسال الرمز"}
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setErrorMsg("");
                setSuccessMsg("");
                setStep("enter");
                setOtpDigits(["", "", "", ""]);
                setResendIn(0);
              }}
              className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-60"
            >
              رجوع
            </button>
          </div>
        ) : null}

        {step === "onboarding" ? (
          <div className="space-y-3">
            <div className="text-sm text-slate-600">
              عشان نجهز طلباتك أسرع، كمّل بياناتك الأساسية.
            </div>

            {/* ✅ NEW: الاسم */}
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="الاسم"
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
            />

            <div className="grid grid-cols-3 gap-2">
              <select
                value={by}
                onChange={(e) =>
                  setBy(e.target.value ? Number(e.target.value) : "")
                }
                className="w-full rounded-xl border px-3 py-3 text-sm outline-none"
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
                className="w-full rounded-xl border px-3 py-3 text-sm outline-none"
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
                className="w-full rounded-xl border px-3 py-3 text-sm outline-none"
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
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
            >
              <option value="">اختر الجنس</option>
              <option value="male">ذكر</option>
              <option value="female">أنثى</option>
            </select>

            <div className="relative">
              <button
                ref={cityBtnRef}
                type="button"
                onClick={() => setCityOpen((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm outline-none"
                disabled={citiesLoading}
              >
                <span
                  className={selectedCity ? "text-slate-900" : "text-slate-500"}
                >
                  {citiesLoading
                    ? "جاري تحميل المدن..."
                    : selectedCity
                      ? selectedCity.name_ar
                      : "اختر المدينة"}
                </span>
                <span className="text-slate-500">▾</span>
              </button>

              {cityOpen ? (
                <div
                  id="city-popover"
                  className="absolute z-50 mt-2 w-full rounded-xl border bg-white shadow-lg"
                >
                  <div className="p-2">
                    <input
                      ref={citySearchRef}
                      value={cityQuery}
                      onChange={(e) => setCityQuery(e.target.value)}
                      placeholder="ابحث عن مدينتك..."
                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                    />
                  </div>

                  <div className="max-h-56 overflow-auto px-2 pb-2">
                    {filteredCities.length === 0 ? (
                      <div className="rounded-lg px-3 py-2 text-sm text-slate-500">
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
                          className={[
                            "flex w-full items-center justify-between rounded-lg px-3 py-2 text-right text-sm hover:bg-slate-50",
                            c.id === cityId ? "bg-slate-100" : "",
                          ].join(" ")}
                        >
                          <span className="text-slate-900">{c.name_ar}</span>
                          <span className="text-xs text-slate-500">
                            {c.name_en}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <button
              disabled={loading}
              onClick={submitOnboarding}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "جاري الحفظ..." : "حفظ البيانات"}
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-60"
            >
              تخطي الآن
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
