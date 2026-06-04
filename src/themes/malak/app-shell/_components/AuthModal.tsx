// FILE: apps/storefront/src/app/(store)/_components/auth/AuthModal.tsx
"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import Icon from "@/components/icon/Icon";

type Step = "enter" | "code" | "onboarding";
type AuthMethod = "phone" | "email";
type Gender = "" | "male" | "female";

type City = {
  id: string;
  name_ar: string;
  name_en: string;
};

type PhoneCountry = {
  iso2: string;
  nameAr: string;
  dialCode: string;
  flagUrl: string;
  placeholder: string;
  maxLength: number;
};

type BoltifyIconName =
  | "UserIdVerification"
  | "MailAtSign01"
  | "Cancel01"
  | "SmartPhone01"
  | "SmsCode";

const PHONE_COUNTRIES: PhoneCountry[] = [
  {
    iso2: "SA",
    nameAr: "السعودية",
    dialCode: "+966",
    flagUrl: "https://flagcdn.com/w40/sa.png",
    placeholder: "5XXXXXXXX",
    maxLength: 9,
  },
  {
    iso2: "YE",
    nameAr: "اليمن",
    dialCode: "+967",
    flagUrl: "https://flagcdn.com/w40/ye.png",
    placeholder: "7XXXXXXXX",
    maxLength: 9,
  },
  {
    iso2: "AE",
    nameAr: "الإمارات",
    dialCode: "+971",
    flagUrl: "https://flagcdn.com/w40/ae.png",
    placeholder: "5XXXXXXXX",
    maxLength: 9,
  },
  {
    iso2: "KW",
    nameAr: "الكويت",
    dialCode: "+965",
    flagUrl: "https://flagcdn.com/w40/kw.png",
    placeholder: "XXXXXXXX",
    maxLength: 8,
  },
  {
    iso2: "QA",
    nameAr: "قطر",
    dialCode: "+974",
    flagUrl: "https://flagcdn.com/w40/qa.png",
    placeholder: "XXXXXXXX",
    maxLength: 8,
  },
  {
    iso2: "BH",
    nameAr: "البحرين",
    dialCode: "+973",
    flagUrl: "https://flagcdn.com/w40/bh.png",
    placeholder: "XXXXXXXX",
    maxLength: 8,
  },
  {
    iso2: "OM",
    nameAr: "عمان",
    dialCode: "+968",
    flagUrl: "https://flagcdn.com/w40/om.png",
    placeholder: "XXXXXXXX",
    maxLength: 8,
  },
  {
    iso2: "EG",
    nameAr: "مصر",
    dialCode: "+20",
    flagUrl: "https://flagcdn.com/w40/eg.png",
    placeholder: "1XXXXXXXXX",
    maxLength: 10,
  },
];

function s(value: unknown) {
  return String(value ?? "").trim();
}

function isEmail(value: string) {
  return value.includes("@");
}

function needsOnboarding(customer: any) {
  if (!customer) return true;

  return (
    !customer.full_name ||
    !customer.birth_date ||
    !customer.gender ||
    !customer.city_id
  );
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function BoltifyIcon({
  name,
  className = "",
}: {
  name: BoltifyIconName;
  className?: string;
}) {
  const Boltify = Icon as unknown as React.ComponentType<{
    name?: string;
    icon?: string;
    type?: string;
    className?: string;
  }>;

  return (
    <Boltify
      name={name}
      icon={name}
      type={name}
      className={className}
    />
  );
}

function AuthIcon({
  name,
  className = "",
}: {
  name:
    | "target"
    | "phone"
    | "mail"
    | "sms"
    | "google"
    | "facebook"
    | "shield"
    | "user"
    | "close"
    | "chevron";
  className?: string;
}) {
  if (name === "target") {
    return <BoltifyIcon name="UserIdVerification" className={className} />;
  }

  if (name === "user") {
    return <BoltifyIcon name="UserIdVerification" className={className} />;
  }

  if (name === "phone") {
    return <BoltifyIcon name="SmartPhone01" className={className} />;
  }

  if (name === "mail") {
    return <BoltifyIcon name="MailAtSign01" className={className} />;
  }

  if (name === "sms") {
    return <BoltifyIcon name="SmsCode" className={className} />;
  }

  if (name === "close") {
    return <BoltifyIcon name="Cancel01" className={className} />;
  }

  if (name === "google") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.58c2.09-1.93 3.27-4.78 3.27-8.09Z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.58-2.77c-.98.66-2.24 1.06-3.7 1.06-2.85 0-5.27-1.93-6.13-4.52H2.18v2.84A11 11 0 0 0 12 23Z"
        />
        <path
          fill="#FBBC05"
          d="M5.87 14.11A6.6 6.6 0 0 1 5.52 12c0-.73.13-1.44.35-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.95l3.69-2.84Z"
        />
        <path
          fill="#EA4335"
          d="M12 5.37c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.69 2.84C6.73 7.3 9.15 5.37 12 5.37Z"
        />
      </svg>
    );
  }

  if (name === "facebook") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path
          fill="#1877F2"
          d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.414c0-3.025 1.79-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97h-1.513c-1.49 0-1.956.93-1.956 1.884v2.266h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z"
        />
      </svg>
    );
  }

  if (name === "chevron") {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        aria-hidden="true"
      >
        <path
          d="m7 10 5 5 5-5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3.75 18.25 6v5.25c0 4.15-2.55 7.4-6.25 9-3.7-1.6-6.25-4.85-6.25-9V6L12 3.75Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="m9.25 12.25 1.75 1.75 3.75-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AuthField({
  label,
  icon,
  children,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="mk-auth-field">
      <span className="mk-auth-field__label">{label}</span>

      <span className="mk-auth-field__control">
        <span className="mk-auth-field__icon">{icon}</span>
        {children}
      </span>
    </label>
  );
}

function PhoneCountryField({
  value,
  country,
  countries,
  onCountryChange,
  onChange,
}: {
  value: string;
  country: PhoneCountry;
  countries: PhoneCountry[];
  onCountryChange: (country: PhoneCountry) => void;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocMouseDown(event: MouseEvent) {
      if (!open) return;

      const target = event.target as Node | null;
      if (!target) return;

      if (wrapRef.current?.contains(target)) return;

      setOpen(false);
    }

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  return (
    <div ref={wrapRef} className="mk-auth-phone">
      <span className="mk-auth-field__label">رقم الجوال أو واتساب</span>

      <div className="mk-auth-phone__control">
        <button
          type="button"
          className="mk-auth-phone__country"
          onClick={() => setOpen((current) => !current)}
          aria-label="اختيار مفتاح الدولة"
        >
          <span className="mk-auth-phone__flag">
            <img src={country.flagUrl} alt={country.nameAr} />
          </span>

          <span className="mk-auth-phone__meta">
            <strong dir="ltr">{country.dialCode}</strong>
            <em>{country.nameAr}</em>
          </span>

          <AuthIcon
            name="chevron"
            className={[
              "mk-auth-phone__chevron",
              open ? "mk-auth-phone__chevron--open" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          />
        </button>

        <input
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value.replace(/\D/g, "").slice(0, country.maxLength),
            )
          }
          dir="ltr"
          inputMode="numeric"
          autoComplete="tel"
          placeholder={country.placeholder}
          className="mk-auth-input mk-auth-input--phone"
        />

        <span className="mk-auth-phone__inputIcon">
          <AuthIcon name="phone" className="mk-auth-icon" />
        </span>

        {open ? (
          <div className="mk-auth-phone__menu" role="listbox">
            <div className="mk-auth-phone__menuScroll">
              {countries.map((item) => {
                const active = item.iso2 === country.iso2;

                return (
                  <button
                    key={item.iso2}
                    type="button"
                    className={[
                      "mk-auth-phone__option",
                      active ? "mk-auth-phone__option--active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => {
                      onCountryChange(item);
                      setOpen(false);
                    }}
                  >
                    <span className="mk-auth-phone__optionFlag">
                      <img src={item.flagUrl} alt={item.nameAr} />
                    </span>

                    <span className="mk-auth-phone__optionText">
                      <strong>{item.nameAr}</strong>
                      <em>{item.iso2}</em>
                    </span>

                    <span className="mk-auth-phone__optionCode" dir="ltr">
                      {item.dialCode}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
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
  const [step, setStep] = useState<Step>("enter");
  const [method, setMethod] = useState<AuthMethod>("phone");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<PhoneCountry>(
    PHONE_COUNTRIES[0],
  );

  const [kind, setKind] = useState<"email" | "phone">("phone");
  const [otpTarget, setOtpTarget] = useState("");

  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", ""]);
  const otpValue = otpDigits.join("");
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<Gender>("");
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

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [resendIn, setResendIn] = useState(0);

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    const rows: number[] = [];

    for (let year = now; year >= now - 90; year--) rows.push(year);

    return rows;
  }, []);

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);

  const selectedCity = useMemo(
    () => cities.find((city) => city.id === cityId),
    [cities, cityId],
  );

  const filteredCities = useMemo(() => {
    const query = cityQuery.trim().toLowerCase();
    if (!query) return cities;

    return cities.filter((city) => {
      const ar = s(city.name_ar).toLowerCase();
      const en = s(city.name_en).toLowerCase();

      return ar.includes(query) || en.includes(query);
    });
  }, [cities, cityQuery]);

  const canSubmitTarget = useMemo(() => {
    if (method === "email") {
      const value = email.trim();
      return value.length >= 5 && isEmail(value);
    }

    return phone.trim().length >= Math.min(8, selectedCountry.maxLength);
  }, [email, method, phone, selectedCountry.maxLength]);

  useEffect(() => {
    if (!open) {
      setStep("enter");
      setMethod("phone");
      setLoading(false);

      setEmail("");
      setPhone("");
      setSelectedCountry(PHONE_COUNTRIES[0]);

      setKind("phone");
      setOtpTarget("");
      setOtpDigits(["", "", "", ""]);

      setFullName("");
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
      window.setTimeout(() => otpRefs.current[0]?.focus(), 80);
    }
  }, [open, step]);

  useEffect(() => {
    if (!open || resendIn <= 0) return;

    const timer = window.setInterval(() => {
      setResendIn((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [open, resendIn]);

  useEffect(() => {
    if (!open || step !== "onboarding") return;

    let cancelled = false;

    async function loadCities() {
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
      } catch (error: any) {
        if (!cancelled) {
          setError(error?.message || "تعذر تحميل المدن");
        }
      } finally {
        if (!cancelled) {
          setCitiesLoading(false);
        }
      }
    }

    loadCities();

    return () => {
      cancelled = true;
    };
  }, [open, step]);

  useEffect(() => {
    if (!by || !bm || !bd) {
      setBirthDate("");
      return;
    }

    setBirthDate(`${by}-${pad2(Number(bm))}-${pad2(Number(bd))}`);
  }, [by, bm, bd]);

  useEffect(() => {
    if (!cityOpen) {
      setCityQuery("");
      return;
    }

    window.setTimeout(() => citySearchRef.current?.focus(), 0);
  }, [cityOpen]);

  useEffect(() => {
    function onDocMouseDown(event: MouseEvent) {
      if (!cityOpen) return;

      const target = event.target as HTMLElement | null;
      const box = document.getElementById("mk-auth-city-popover");

      if (!target || !box) return;
      if (box.contains(target) || cityBtnRef.current?.contains(target)) return;

      setCityOpen(false);
    }

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [cityOpen]);

  function setError(message: string) {
    setSuccessMsg("");
    setErrorMsg(message);
  }

  function setSuccess(message: string) {
    setErrorMsg("");
    setSuccessMsg(message);
  }

  function buildTarget() {
    if (method === "email") return email.trim().toLowerCase();

    const local = phone.trim();
    if (!local) return "";

    return `${selectedCountry.dialCode}${local}`;
  }

  async function syncCartAfterLogin() {
    try {
      await fetch("/api/cart", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });
    } catch {
      // لا نوقف تسجيل الدخول لو فشل دمج السلة
    }
  }

  async function sendOtp(opts?: { silent?: boolean }) {
    const target = buildTarget();

    if (!target) {
      setError("فضلاً أدخل بيانات تسجيل الدخول");
      return;
    }

    if (method === "email" && !isEmail(target)) {
      setError("فضلاً أدخل بريد إلكتروني صحيح");
      return;
    }

    if (method === "phone" && phone.trim().length < 6) {
      setError("فضلاً أدخل رقم جوال صحيح");
      return;
    }

    setLoading(true);

    if (!opts?.silent) {
      setErrorMsg("");
      setSuccessMsg("");
    }

    try {
      const nextKind = isEmail(target) ? "email" : "phone";
      setKind(nextKind);

      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ target }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.message || json?.error || "OTP_SEND_FAILED");
      }

      setOtpTarget(target);
      setOtpDigits(["", "", "", ""]);
      setStep("code");
      setResendIn(60);
      setSuccess("تم إرسال رمز التحقق");
    } catch (error: any) {
      setError(error?.message || "تعذر إرسال رمز التحقق");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    const token = otpValue.trim();

    if (token.length !== 4) {
      setError("فضلاً أدخل رمز التحقق كاملًا");
      return;
    }

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
          target: otpTarget,
          token,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.message || json?.error || "OTP_VERIFY_FAILED");
      }

      await syncCartAfterLogin();

      onAuthed();
      setSuccess("تم تسجيل الدخول");

      const meRes = await fetch("/api/auth/me", {
        cache: "no-store",
        credentials: "include",
      });

      const me = await meRes.json().catch(() => ({}));

      if (me?.authed && me?.customer?.full_name && !fullName.trim()) {
        setFullName(s(me.customer.full_name));
      }

      if (me?.authed && needsOnboarding(me?.customer)) {
        setStep("onboarding");
      } else {
        onClose();
      }
    } catch (error: any) {
      setError(error?.message || "رمز التحقق غير صحيح");
    } finally {
      setLoading(false);
    }
  }

  async function submitOnboarding() {
    if (!fullName.trim() || !birthDate || !gender || !cityId) {
      setError("فضلاً أكمل البيانات الأساسية");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          full_name: fullName.trim(),
          birth_date: birthDate,
          gender,
          city_id: cityId,
        }),
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

      if (!me?.authed) {
        throw new Error("UNAUTHENTICATED");
      }

      if (needsOnboarding(me?.customer)) {
        setError("تم الحفظ، لكن بقيت بيانات ناقصة. تأكد من المدخلات.");
        return;
      }

      await syncCartAfterLogin();

      setSuccess("تم حفظ بياناتك");
      onAuthed();
      onClose();
    } catch (error: any) {
      setError(error?.message || "تعذر حفظ البيانات");
    } finally {
      setLoading(false);
    }
  }

  function setDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(0, 1);

    setOtpDigits((current) => {
      const next = [...current];
      next[index] = digit;
      return next;
    });

    if (digit && index < 3) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Backspace") {
      if (otpDigits[index]) {
        setOtpDigits((current) => {
          const next = [...current];
          next[index] = "";
          return next;
        });
      } else if (index > 0) {
        otpRefs.current[index - 1]?.focus();

        setOtpDigits((current) => {
          const next = [...current];
          next[index - 1] = "";
          return next;
        });
      }
    }

    if (event.key === "ArrowLeft" && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < 3) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 4);

    if (!text) return;

    event.preventDefault();

    const digits = text.split("");
    setOtpDigits([
      digits[0] || "",
      digits[1] || "",
      digits[2] || "",
      digits[3] || "",
    ]);

    const index = Math.min(text.length - 1, 3);
    window.setTimeout(() => otpRefs.current[index]?.focus(), 0);
  }

 function handleSocialLogin(provider: "google" | "facebook") {
  if (loading) return;

  setErrorMsg("");
  setSuccessMsg("");

  const next =
    typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "/";

  window.location.href = `/api/auth/oauth/start?provider=${provider}&next=${encodeURIComponent(
    next,
  )}`;
}

  if (!open) return null;

  const title =
    step === "enter"
      ? "تسجيل الدخول"
      : step === "code"
        ? "تأكيد رمز الدخول"
        : "إكمال بياناتك";

  const description =
    step === "enter"
      ? "ادخل بياناتك لتسجيل الدخول بسرعة وأمان، وسنرسل لك رمز تحقق مكون من 4 أرقام."
      : step === "code"
        ? "أدخل الرمز المرسل لك لإكمال تسجيل الدخول."
        : "كمّل بياناتك الأساسية لتجربة طلب أسرع وأكثر دقة.";

  const markIcon =
    step === "code" ? "sms" : step === "onboarding" ? "user" : "target";

  return (
    <div className="mk-auth" dir="rtl">
      <button
        type="button"
        className="mk-auth__backdrop"
        onClick={onClose}
        aria-label="إغلاق تسجيل الدخول"
      />

      <section className="mk-auth__dialog" role="dialog" aria-modal="true">
        <button
          type="button"
          className="mk-auth__close"
          onClick={onClose}
          disabled={loading}
          aria-label="إغلاق"
        >
          <AuthIcon name="close" className="mk-auth__closeIcon" />
        </button>

        <div className="mk-auth__glow" />

        <div className="mk-auth__mark" aria-hidden="true">
          <span>
            <AuthIcon name={markIcon} />
          </span>
        </div>

        <header className="mk-auth__head">
          <h2>{title}</h2>
          <p>{description}</p>
        </header>

        {errorMsg ? (
          <div className="mk-auth-alert mk-auth-alert--error">{errorMsg}</div>
        ) : null}

        {successMsg ? (
          <div className="mk-auth-alert mk-auth-alert--success">
            {successMsg}
          </div>
        ) : null}

        {step === "enter" ? (
          <div className="mk-auth__body">
            <div className="mk-auth-tabs" role="tablist">
              <button
                type="button"
                className={[
                  "mk-auth-tabs__item",
                  method === "phone" ? "mk-auth-tabs__item--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  setMethod("phone");
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
              >
                <AuthIcon name="sms" className="mk-auth-tabs__icon" />
                <span>رسالة نصية</span>
              </button>

              <button
                type="button"
                className={[
                  "mk-auth-tabs__item",
                  method === "email" ? "mk-auth-tabs__item--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  setMethod("email");
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
              >
                <AuthIcon name="mail" className="mk-auth-tabs__icon" />
                <span>البريد الإلكتروني</span>
              </button>
            </div>

            {method === "phone" ? (
              <PhoneCountryField
                value={phone}
                country={selectedCountry}
                countries={PHONE_COUNTRIES}
                onCountryChange={(country) => {
                  setSelectedCountry(country);
                  setPhone("");
                }}
                onChange={setPhone}
              />
            ) : (
              <AuthField
                label="البريد الإلكتروني"
                icon={<AuthIcon name="mail" className="mk-auth-icon" />}
              >
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  dir="ltr"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="mk-auth-input"
                />
              </AuthField>
            )}

            <button
              type="button"
              disabled={loading || !canSubmitTarget}
              onClick={() => sendOtp()}
              className="mk-auth-submit"
            >
              {loading ? "جاري الإرسال..." : "إرسال رمز التحقق"}
            </button>

            <div className="mk-auth-divider">
              <span />
              <em>أو سجل دخولك من خلال</em>
              <span />
            </div>

            <div className="mk-auth-social">
              <button
                type="button"
                className="mk-auth-social__btn"
                onClick={() => handleSocialLogin("google")}
              >
                <AuthIcon name="google" className="mk-auth-social__icon" />
                <span>Google</span>
              </button>

              <button
                type="button"
                className="mk-auth-social__btn"
                onClick={() => handleSocialLogin("facebook")}
              >
                <AuthIcon name="facebook" className="mk-auth-social__icon" />
                <span>Facebook</span>
              </button>
            </div>

            <p className="mk-auth-note">
              <AuthIcon name="shield" className="mk-auth-note__icon" />
              لتسجيل الدخول ومتابعة طلباتك وحفظ بياناتك بأمان.
            </p>
          </div>
        ) : null}

        {step === "code" ? (
          <div className="mk-auth__body">
            <div className="mk-auth-codeInfo">
              <span>تم إرسال رمز التحقق إلى</span>
              <strong dir="ltr">{otpTarget}</strong>
            </div>

            <div className="mk-auth-otp" dir="ltr">
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    otpRefs.current[index] = el;
                  }}
                  value={digit}
                  onChange={(event) => setDigit(index, event.target.value)}
                  onKeyDown={(event) => handleOtpKeyDown(index, event)}
                  onPaste={handleOtpPaste}
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  className="mk-auth-otp__input"
                />
              ))}
            </div>

            <button
              type="button"
              disabled={loading || otpValue.length !== 4}
              onClick={verifyOtp}
              className="mk-auth-submit"
            >
              {loading ? "جاري التحقق..." : "تأكيد الدخول"}
            </button>

            <div className="mk-auth-codeActions">
              <button
                type="button"
                disabled={loading || resendIn > 0}
                onClick={() => sendOtp({ silent: true })}
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
              >
                تعديل البيانات
              </button>
            </div>
          </div>
        ) : null}

        {step === "onboarding" ? (
          <div className="mk-auth__body">
            <AuthField
              label="الاسم"
              icon={<AuthIcon name="user" className="mk-auth-icon" />}
            >
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="اكتب اسمك"
                className="mk-auth-input"
              />
            </AuthField>

            <div className="mk-auth-date">
              <span className="mk-auth-field__label">تاريخ الميلاد</span>

              <div className="mk-auth-date__grid">
                <select
                  value={by}
                  onChange={(event) =>
                    setBy(event.target.value ? Number(event.target.value) : "")
                  }
                  className="mk-auth-select"
                >
                  <option value="">السنة</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>

                <select
                  value={bm}
                  onChange={(event) =>
                    setBm(event.target.value ? Number(event.target.value) : "")
                  }
                  className="mk-auth-select"
                >
                  <option value="">الشهر</option>
                  {months.map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>

                <select
                  value={bd}
                  onChange={(event) =>
                    setBd(event.target.value ? Number(event.target.value) : "")
                  }
                  className="mk-auth-select"
                >
                  <option value="">اليوم</option>
                  {days.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mk-auth-gender">
              <span className="mk-auth-field__label">الجنس</span>

              <div className="mk-auth-gender__grid">
                <button
                  type="button"
                  className={[
                    "mk-auth-choice",
                    gender === "female" ? "mk-auth-choice--active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setGender("female")}
                >
                  أنثى
                </button>

                <button
                  type="button"
                  className={[
                    "mk-auth-choice",
                    gender === "male" ? "mk-auth-choice--active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setGender("male")}
                >
                  ذكر
                </button>
              </div>
            </div>

            <div className="mk-auth-city">
              <span className="mk-auth-field__label">المدينة</span>

              <button
                ref={cityBtnRef}
                type="button"
                onClick={() => setCityOpen((current) => !current)}
                className="mk-auth-city__button"
                disabled={citiesLoading}
              >
                <span>
                  {citiesLoading
                    ? "جاري تحميل المدن..."
                    : selectedCity
                      ? selectedCity.name_ar
                      : "اختر المدينة"}
                </span>

                <AuthIcon
                  name="chevron"
                  className={[
                    "mk-auth-city__chevron",
                    cityOpen ? "mk-auth-city__chevron--open" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
              </button>

              {cityOpen ? (
                <div id="mk-auth-city-popover" className="mk-auth-city__menu">
                  <input
                    ref={citySearchRef}
                    value={cityQuery}
                    onChange={(event) => setCityQuery(event.target.value)}
                    placeholder="ابحث عن مدينتك..."
                    className="mk-auth-city__search"
                  />

                  <div className="mk-auth-city__list">
                    {filteredCities.length === 0 ? (
                      <div className="mk-auth-city__empty">لا توجد نتائج</div>
                    ) : (
                      filteredCities.map((city) => (
                        <button
                          key={city.id}
                          type="button"
                          onClick={() => {
                            setCityId(city.id);
                            setCityOpen(false);
                          }}
                          className={[
                            "mk-auth-city__option",
                            city.id === cityId
                              ? "mk-auth-city__option--active"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <strong>{city.name_ar}</strong>
                          <em>{city.name_en}</em>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={submitOnboarding}
              className="mk-auth-submit"
            >
              {loading ? "جاري الحفظ..." : "حفظ البيانات"}
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="mk-auth-secondary"
            >
              تخطي الآن
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}