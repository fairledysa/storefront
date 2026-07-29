import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getOrdersDb } from "@/data/db/orders-db.server";
import { verifySession } from "@/lib/auth/session";
import { createUploadProof } from "@/lib/uploads/upload-proof.server";
import { getStoreIdOrThrow } from "@/app/(store)/api/_cart/cart.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const CUSTOMER_UPLOAD_KINDS = new Set([
  "bank-transfer-receipt",
  "product-attachment",
  "review-media",
]);

const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type UploadHandlerOptions = {
  allowedKinds?: ReadonlySet<string>;
  forcedKind?: string;
  requireCustomer?: boolean;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeMime(value: unknown) {
  const mime = clean(value).toLowerCase();
  return mime === "image/jpg" ? "image/jpeg" : mime;
}

function userMessage(error: string) {
  const messages: Record<string, string> = {
    STORE_NOT_FOUND: "تعذر تحديد المتجر، حدّث الصفحة وحاول مرة أخرى.",
    UNAUTHENTICATED: "سجّل الدخول ثم حاول رفع الصورة مرة أخرى.",
    INVALID_FORM_DATA: "تعذر قراءة ملف الصورة، جرّب رفع الصورة مرة أخرى.",
    INVALID_UPLOAD_KIND: "نوع الرفع غير مسموح.",
    MISSING_FILE: "لم يتم اختيار صورة للرفع.",
    FILE_TOO_LARGE: "حجم الصورة كبير. الحد الأقصى المسموح هو 10 ميجا.",
    ONLY_SUPPORTED_IMAGES_ALLOWED:
      "نوع الصورة غير مدعوم. الصيغ المسموحة: JPG أو PNG أو WEBP.",
    IMAGE_SIGNATURE_MISMATCH:
      "محتوى الصورة لا يطابق نوع الملف. اختر صورة أخرى.",
    CDN_WORKER_BASE_URL_MISSING: "إعدادات رفع الصور غير مكتملة.",
    CDN_WORKER_UPLOAD_TOKEN_MISSING: "إعدادات رفع الصور غير مكتملة.",
    WORKER_FILE_TOO_LARGE:
      "حجم الصورة كبير على خادم الرفع. الحد الأقصى 10 ميجا.",
    WORKER_HTTP_ERROR: "تعذر رفع الصورة الآن، حاول مرة أخرى.",
    WORKER_BAD_JSON: "تعذر قراءة نتيجة رفع الصورة.",
    WORKER_MISSING_PUBLIC_URL: "تم الرفع لكن لم يرجع رابط صورة صالح.",
    STOREFRONT_UPLOAD_ROUTE_EXCEPTION: "حدث خطأ أثناء رفع الصورة.",
  };

  return messages[error] || "تعذر رفع الصورة الآن، حاول مرة أخرى.";
}

function fail(
  error: string,
  status = 400,
  internalDetails?: Record<string, unknown>,
) {
  if (internalDetails) {
    console.error("[storefront/upload]", {
      error,
      ...internalDetails,
    });
  }

  return NextResponse.json(
    {
      ok: false,
      error,
      message: userMessage(error),
      ...(process.env.NODE_ENV !== "production" && internalDetails
        ? { details: internalDetails }
        : {}),
    },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

function safeFileName(name: string) {
  const value = clean(name || "image")
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return value.slice(0, 180) || "image";
}

function normalizeKind(
  value: unknown,
  allowedKinds: ReadonlySet<string>,
) {
  const kind = clean(value || "product-attachment");
  return allowedKinds.has(kind) ? kind : "";
}

function normalizeWorkerBase(value: string) {
  return clean(value).replace(/\/+$/, "");
}

function bearerToken(request: Request) {
  const authorization = clean(request.headers.get("authorization"));
  if (!authorization.toLowerCase().startsWith("bearer ")) return "";
  return authorization.slice(7).trim();
}

async function resolveStoreCustomerId(request: Request, storeId: string) {
  const jar = await cookies();
  const token =
    bearerToken(request) ||
    clean(jar.get("elyaia_session")?.value) ||
    clean(jar.get("elyaiaSession")?.value);

  if (!token) return null;

  const session = verifySession(token);
  const customerId = clean(session?.customer_id);
  if (!customerId) return null;

  const db: any = await getOrdersDb(storeId);
  const link = await db
    .from("store_customers")
    .select("customer_id")
    .eq("store_id", storeId)
    .eq("customer_id", customerId)
    .limit(1)
    .maybeSingle();

  if (link.error || !link.data?.customer_id) return null;
  return customerId;
}

async function detectImageMime(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());

  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }

  return "";
}

function safePublicUrl(value: unknown) {
  try {
    const url = new URL(clean(value));
    const protocolAllowed =
      url.protocol === "https:" ||
      (process.env.NODE_ENV !== "production" && url.protocol === "http:");

    if (!protocolAllowed || url.username || url.password) return "";
    return url.toString();
  } catch {
    return "";
  }
}

export async function handleStoreImageUpload(
  request: Request,
  options: UploadHandlerOptions = {},
) {
  try {
    const storeId = await getStoreIdOrThrow(request);
    const allowedKinds = options.allowedKinds ?? CUSTOMER_UPLOAD_KINDS;

    let form: FormData;
    try {
      form = await request.formData();
    } catch (error: any) {
      return fail("INVALID_FORM_DATA", 415, {
        contentType: request.headers.get("content-type") || "",
        message: clean(error?.message) || "FORM_DATA_PARSE_FAILED",
      });
    }

    const kind = normalizeKind(
      options.forcedKind || form.get("kind"),
      allowedKinds,
    );
    if (!kind) return fail("INVALID_UPLOAD_KIND", 400);

    const requireCustomer = options.requireCustomer !== false;
    const customerId = requireCustomer
      ? await resolveStoreCustomerId(request, storeId)
      : null;

    if (requireCustomer && !customerId) {
      return fail("UNAUTHENTICATED", 401);
    }

    const fileValue = form.get("file");
    if (!(fileValue instanceof File)) {
      return fail("MISSING_FILE", 400);
    }

    const declaredMime = normalizeMime(fileValue.type);
    const fileSize = Number(fileValue.size || 0);
    const fileName = safeFileName(fileValue.name);

    if (!ALLOWED_IMAGE_MIMES.has(declaredMime)) {
      return fail("ONLY_SUPPORTED_IMAGES_ALLOWED", 400);
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return fail("MISSING_FILE", 400);
    }

    if (fileSize > MAX_IMAGE_BYTES) {
      return fail("FILE_TOO_LARGE", 413);
    }

    const detectedMime = await detectImageMime(fileValue);
    if (!detectedMime || detectedMime !== declaredMime) {
      return fail("IMAGE_SIGNATURE_MISMATCH", 400, {
        declaredMime,
        detectedMime: detectedMime || null,
        fileName,
      });
    }

    const workerBase = normalizeWorkerBase(
      process.env.CDN_WORKER_BASE_URL || "",
    );
    const workerToken = clean(process.env.CDN_WORKER_UPLOAD_TOKEN);

    if (!workerBase) return fail("CDN_WORKER_BASE_URL_MISSING", 500);
    if (!workerToken) return fail("CDN_WORKER_UPLOAD_TOKEN_MISSING", 500);

    const output = new FormData();
    output.append("store_id", storeId);
    output.append("kind", kind);
    output.append("file", fileValue, fileName);

    const workerResponse = await fetch(`${workerBase}/v1/uploads/put`, {
      method: "POST",
      headers: { authorization: `Bearer ${workerToken}` },
      body: output,
    });

    const workerText = await workerResponse.text();
    if (!workerResponse.ok) {
      return fail(
        workerResponse.status === 413
          ? "WORKER_FILE_TOO_LARGE"
          : "WORKER_HTTP_ERROR",
        workerResponse.status === 413 ? 413 : 502,
        {
          workerStatus: workerResponse.status,
          storeId,
          kind,
          fileName,
        },
      );
    }

    let workerPayload: any = null;
    try {
      workerPayload = JSON.parse(workerText);
    } catch {
      workerPayload = null;
    }

    if (!workerPayload?.ok) {
      return fail("WORKER_BAD_JSON", 502, {
        workerStatus: workerResponse.status,
        storeId,
        kind,
      });
    }

    const publicUrl = safePublicUrl(
      workerPayload.publicUrl || workerPayload.public_url,
    );
    if (!publicUrl) {
      return fail("WORKER_MISSING_PUBLIC_URL", 502, {
        storeId,
        kind,
        key: clean(workerPayload.key) || null,
      });
    }

    const uploadProofToken =
      kind === "bank-transfer-receipt" && customerId
        ? createUploadProof({
            store_id: storeId,
            customer_id: customerId,
            public_url: publicUrl,
            mime_type: detectedMime,
            size_bytes: fileSize,
          })
        : null;

    return NextResponse.json(
      {
        ok: true,
        store_id: storeId,
        kind,
        key: workerPayload.key || null,
        publicUrl,
        public_url: publicUrl,
        fileName,
        fileType: detectedMime,
        fileSize,
        maxSize: MAX_IMAGE_BYTES,
        maxSizeMb: 10,
        ...(uploadProofToken
          ? {
              uploadProofToken,
              upload_proof_token: uploadProofToken,
            }
          : {}),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: any) {
    return fail("STOREFRONT_UPLOAD_ROUTE_EXCEPTION", 500, {
      message: clean(error?.message) || "UPLOAD_FAILED",
    });
  }
}

export async function POST(request: Request) {
  return handleStoreImageUpload(request);
}
