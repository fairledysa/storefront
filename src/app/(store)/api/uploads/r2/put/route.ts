// FILE: apps/storefront/src/app/(store)/api/uploads/r2/put/route.ts

import { NextResponse } from "next/server";

import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB

const ALLOWED_KINDS = new Set<string>([
  "product-attachment",
  "review-media",
  "logo",
  "verification/id",
  "verification/cr",
]);

const ALLOWED_IMAGE_MIMES = new Set<string>([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

function fail(error: string, status = 400, details?: any) {
  return NextResponse.json(
    {
      ok: false,
      error,
      message: getUserMessage(error),
      details,
    },
    { status },
  );
}

function getUserMessage(error: string) {
  const messages: Record<string, string> = {
    STORE_NOT_FOUND: "تعذر تحديد المتجر، حدّث الصفحة وحاول مرة أخرى.",
    INVALID_FORM_DATA: "تعذر قراءة ملف الصورة، جرّب رفع الصورة مرة أخرى.",
    MISSING_FILE: "لم يتم اختيار صورة للرفع.",
    FILE_TOO_LARGE: "حجم الصورة كبير. الحد الأقصى المسموح هو 10 ميجا.",
    ONLY_SUPPORTED_IMAGES_ALLOWED:
      "نوع الصورة غير مدعوم. الصيغ المسموحة: JPG أو PNG أو WEBP.",
    CDN_WORKER_BASE_URL_MISSING: "إعدادات رفع الصور غير مكتملة.",
    CDN_WORKER_UPLOAD_TOKEN_MISSING: "إعدادات رفع الصور غير مكتملة.",
    WORKER_FILE_TOO_LARGE:
      "حجم الصورة كبير على خادم الرفع. تأكد أن حد الرفع في Worker مضبوط على 10 ميجا.",
    WORKER_HTTP_ERROR: "تعذر رفع الصورة الآن، حاول مرة أخرى.",
    WORKER_BAD_JSON: "تعذر قراءة نتيجة رفع الصورة.",
    WORKER_MISSING_PUBLIC_URL: "تم الرفع لكن لم يرجع رابط الصورة.",
    STOREFRONT_UPLOAD_ROUTE_EXCEPTION: "حدث خطأ أثناء رفع الصورة.",
  };

  return messages[error] || "تعذر رفع الصورة الآن، حاول مرة أخرى.";
}

function safeFileName(name: string) {
  const clean = String(name || "image")
    .trim()
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return clean || "image";
}

function normalizeKind(value: unknown) {
  const kind = String(value || "product-attachment").trim();
  return ALLOWED_KINDS.has(kind) ? kind : "product-attachment";
}

function normalizeWorkerBase(value: string) {
  return String(value || "").trim().replace(/\/+$/, "");
}

export async function POST(req: Request) {
  try {
    const ctx = await resolveStoreContext();
    const storeId = String(ctx?.store?.id || "").trim();

    if (!storeId) {
      return fail("STORE_NOT_FOUND", 404);
    }

    let form: FormData;

    try {
      form = await req.formData();
    } catch (e: any) {
      return fail("INVALID_FORM_DATA", 415, {
        contentType: req.headers.get("content-type") || "",
        message: String(e?.message || e),
      });
    }

    const kind = normalizeKind(form.get("kind"));
    const fileValue = form.get("file");

    if (!(fileValue instanceof File)) {
      return fail("MISSING_FILE", 400, {
        kind,
        valueType: typeof fileValue,
        contentType: req.headers.get("content-type") || "",
      });
    }

    const mime = String(fileValue.type || "").toLowerCase();
    const fileSize = Number(fileValue.size || 0);
    const fileName = safeFileName(fileValue.name);

    if (!ALLOWED_IMAGE_MIMES.has(mime)) {
      return fail("ONLY_SUPPORTED_IMAGES_ALLOWED", 400, {
        fileName,
        mime: fileValue.type,
        allowed: Array.from(ALLOWED_IMAGE_MIMES),
      });
    }

    if (fileSize <= 0) {
      return fail("MISSING_FILE", 400, {
        fileName,
        mime,
        size: fileSize,
      });
    }

    if (fileSize > MAX_IMAGE_BYTES) {
      return fail("FILE_TOO_LARGE", 413, {
        fileName,
        mime,
        size: fileSize,
        maxSize: MAX_IMAGE_BYTES,
        maxSizeMb: 10,
      });
    }

    const workerBase = normalizeWorkerBase(
      process.env.CDN_WORKER_BASE_URL || "",
    );
    const token = process.env.CDN_WORKER_UPLOAD_TOKEN || "";

    if (!workerBase) return fail("CDN_WORKER_BASE_URL_MISSING", 500);
    if (!token) return fail("CDN_WORKER_UPLOAD_TOKEN_MISSING", 500);

    const url = `${workerBase}/v1/uploads/put`;

    const outForm = new FormData();
    outForm.append("store_id", storeId);
    outForm.append("kind", kind);
    outForm.append("file", fileValue, fileName);

    const r = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
      },
      body: outForm,
    });

    const text = await r.text();

    if (!r.ok) {
      const workerError =
        r.status === 413 ? "WORKER_FILE_TOO_LARGE" : "WORKER_HTTP_ERROR";

      return fail(workerError, r.status, {
        workerStatus: r.status,
        workerBodyPreview: text.slice(0, 1200),
        url,
        storeId,
        kind,
        fileName,
        mime: fileValue.type,
        size: fileSize,
        maxSize: MAX_IMAGE_BYTES,
        maxSizeMb: 10,
      });
    }

    let j: any = null;

    try {
      j = JSON.parse(text);
    } catch {
      j = null;
    }

    if (!j?.ok) {
      return fail("WORKER_BAD_JSON", 500, {
        workerBodyPreview: text.slice(0, 1200),
      });
    }

    const publicUrl = String(j.publicUrl || j.public_url || "").trim();

    if (!publicUrl) {
      return fail("WORKER_MISSING_PUBLIC_URL", 500, {
        workerBodyPreview: text.slice(0, 1200),
        key: j.key || null,
      });
    }

    return NextResponse.json({
      ok: true,
      store_id: storeId,
      kind,
      key: j.key || null,
      publicUrl,
      public_url: publicUrl,
      fileName,
      fileType: fileValue.type || "application/octet-stream",
      fileSize,
      maxSize: MAX_IMAGE_BYTES,
      maxSizeMb: 10,
    });
  } catch (e: any) {
    return fail("STOREFRONT_UPLOAD_ROUTE_EXCEPTION", 500, {
      message: String(e?.message || e),
    });
  }
}