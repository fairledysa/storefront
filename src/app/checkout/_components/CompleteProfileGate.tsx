//apps/storefront/src/app/checkout/_components/CompleteProfileGate.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Profile = {
  full_name: string | null;
  email: string | null;
  phone_e164: string | null;
  phone_verified: boolean | null;
};

function s(x: any) {
  return String(x ?? "").trim();
}

function normalizePhone(x: string) {
  return s(x).replace(/\s+/g, "");
}

export default function CompleteProfileGate() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const missing = useMemo(() => {
    if (!isLoggedIn) return false;
    const nameMissing = !s(profile?.full_name);
    const phoneMissing = !s(profile?.phone_e164);
    return nameMissing || phoneMissing;
  }, [profile, isLoggedIn]);

  const open = !loading && isLoggedIn && missing;

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch("/api/checkout/profile", {
        cache: "no-store",
        credentials: "same-origin",
      });

      const json = await res.json().catch(() => ({}));

      if (res.status === 401) {
        setIsLoggedIn(false);
        setProfile(null);
        setFullName("");
        setPhone("");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setIsLoggedIn(false);
        setProfile(null);
        setLoading(false);
        return;
      }

      const p: Profile = json?.profile ?? null;

      setIsLoggedIn(true);
      setProfile(p);
      setFullName(s(p?.full_name));
      setPhone(s(p?.phone_e164));
      setLoading(false);
    } catch {
      setIsLoggedIn(false);
      setProfile(null);
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();

    const onAuthChanged = () => {
      void load();
    };

    window.addEventListener("auth:changed", onAuthChanged);
    window.addEventListener("focus", onAuthChanged);

    return () => {
      window.removeEventListener("auth:changed", onAuthChanged);
      window.removeEventListener("focus", onAuthChanged);
    };
  }, []);

  async function save() {
    setSaving(true);
    setErr(null);

    const payload = {
      full_name: s(fullName) || null,
      phone_e164: normalizePhone(phone) || null,
    };

    if (!payload.full_name || !payload.phone_e164) {
      setErr("لازم الاسم الكامل + رقم الجوال.");
      setSaving(false);
      return;
    }

    const res = await fetch("/api/checkout/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));

    if (res.status === 401) {
      setIsLoggedIn(false);
      setProfile(null);
      setErr(null);
      setSaving(false);
      return;
    }

    if (!res.ok) {
      setErr(json?.message_ar || json?.error || "فشل حفظ البيانات");
      setSaving(false);
      return;
    }

    setProfile(json?.profile ?? profile);
    setFullName(s(json?.profile?.full_name));
    setPhone(s(json?.profile?.phone_e164));
    setSaving(false);

    window.dispatchEvent(new CustomEvent("checkout:profile-updated"));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/40" />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
          <div className="text-lg font-semibold">أكمل بياناتك</div>
          <div className="mt-1 text-sm opacity-70">
            لازم الاسم الكامل ورقم الجوال قبل متابعة إتمام الطلب.
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <div className="mb-1 text-sm font-medium">الاسم الكامل</div>
              <input
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="مثال: محمد أحمد"
                autoFocus
              />
            </div>

            <div>
              <div className="mb-1 text-sm font-medium">رقم الجوال</div>
              <input
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="مثال: +9665xxxxxxxx أو 05xxxxxxxx"
                inputMode="tel"
              />
              <div className="mt-1 text-xs opacity-60">
                (التحقق الفعلي للجوال لاحقًا — الآن نخزن الرقم فقط)
              </div>
            </div>

            {err ? (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {err}
              </div>
            ) : null}

            <button
              className="mt-2 w-full rounded-xl bg-black px-4 py-2 text-white disabled:opacity-60"
              onClick={save}
              disabled={saving}
              type="button"
            >
              {saving ? "جاري الحفظ..." : "حفظ ومتابعة"}
            </button>

            <button
              className="w-full rounded-xl border px-4 py-2 text-sm disabled:opacity-60"
              onClick={() => void load()}
              disabled={saving}
              type="button"
            >
              تحديث
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}