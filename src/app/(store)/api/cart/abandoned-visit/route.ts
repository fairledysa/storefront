// FILE: apps/storefront/src/app/(store)/api/cart/abandoned-visit/route.ts

import { NextResponse } from "next/server";
import { getOrdersDb } from "@/data/db/orders-db.server";

import { getStoreIdOrThrow } from "../../_cart/cart.server";

export const dynamic = "force-dynamic";

type ReminderJobRow = {
  id: string;
  store_id: string;
  cart_id: string;
  metadata: Record<string, unknown> | null;
};

function s(value: unknown) {
  return String(value ?? "").trim();
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function jsonError(error: string, message: string, status = 400) {
  return NextResponse.json(
    {
      error,
      message,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function detectDeviceType(request: Request) {
  const ua = request.headers.get("user-agent") || "";

  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|android|iphone|ipod/i.test(ua)) return "mobile";

  return "desktop";
}

async function markTrackingVisited({
  ordersDb,
  storeId,
  cartId,
  request,
  visitedAt,
}: {
  ordersDb: any;
  storeId: string;
  cartId: string;
  request: Request;
  visitedAt: string;
}) {
  const updateResult = await ordersDb
    .from("cart_tracking")
    .update({
      visited_after_reminder_at: visitedAt,
      updated_at: visitedAt,
    })
    .eq("store_id", storeId)
    .eq("cart_id", cartId)
    .select("cart_id")
    .maybeSingle();

  if (updateResult.error && updateResult.error.code !== "PGRST116") {
    throw updateResult.error;
  }

  if (updateResult.data?.cart_id) {
    return {
      created: false,
      updated: true,
    };
  }

  const insertResult = await ordersDb.from("cart_tracking").insert({
    store_id: storeId,
    cart_id: cartId,
    source_channel: "reminder",
    device_type: detectDeviceType(request),
    visited_after_reminder_at: visitedAt,
    created_at: visitedAt,
    updated_at: visitedAt,
  });

  if (insertResult.error) {
    const retryResult = await ordersDb
      .from("cart_tracking")
      .update({
        visited_after_reminder_at: visitedAt,
        updated_at: visitedAt,
      })
      .eq("store_id", storeId)
      .eq("cart_id", cartId);

    if (retryResult.error) {
      throw insertResult.error;
    }

    return {
      created: false,
      updated: true,
    };
  }

  return {
    created: true,
    updated: false,
  };
}

async function markJobVisited({
  ordersDb,
  job,
  visitedAt,
}: {
  ordersDb: any;
  job: ReminderJobRow;
  visitedAt: string;
}) {
  const previousMetadata = asRecord(job.metadata);

  const nextMetadata = {
    ...previousMetadata,
    visitedAfterReminderAt: visitedAt,
    visitedTrackedAt: visitedAt,
    visitedSource: "storefront_cart",
  };

  const result = await ordersDb
    .from("abandoned_cart_reminder_jobs")
    .update({
      metadata: nextMetadata,
      updated_at: visitedAt,
    })
    .eq("store_id", job.store_id)
    .eq("id", job.id);

  if (result.error) {
    throw result.error;
  }
}

async function markStateVisited({
  ordersDb,
  storeId,
  cartId,
  jobId,
  visitedAt,
}: {
  ordersDb: any;
  storeId: string;
  cartId: string;
  jobId: string;
  visitedAt: string;
}) {
  const stateResult = await ordersDb
    .from("abandoned_cart_states")
    .select("metadata")
    .eq("store_id", storeId)
    .eq("cart_id", cartId)
    .maybeSingle();

  if (stateResult.error && stateResult.error.code !== "PGRST116") {
    throw stateResult.error;
  }

  if (!stateResult.data) return;

  const previousMetadata = asRecord(stateResult.data.metadata);

  const updateResult = await ordersDb
    .from("abandoned_cart_states")
    .update({
      metadata: {
        ...previousMetadata,
        visitedAfterReminderAt: visitedAt,
        visitedReminderJobId: jobId,
      },
      updated_at: visitedAt,
    })
    .eq("store_id", storeId)
    .eq("cart_id", cartId);

  if (updateResult.error) {
    throw updateResult.error;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      jobId?: string;
      acj?: string;
      abandonedJobId?: string;
    };

    const jobId = s(body.jobId || body.acj || body.abandonedJobId);

    if (!jobId) {
      return jsonError(
        "MISSING_JOB_ID",
        "لم يتم إرسال معرف تذكير السلة.",
        400,
      );
    }

    if (!isUuidLike(jobId)) {
      return jsonError(
        "INVALID_JOB_ID",
        "معرف تذكير السلة غير صحيح.",
        400,
      );
    }

    const storeId = await getStoreIdOrThrow();
    const ordersDb = await getOrdersDb(storeId);

    const jobResult = await ordersDb
      .from("abandoned_cart_reminder_jobs")
      .select("id,store_id,cart_id,metadata")
      .eq("store_id", storeId)
      .eq("id", jobId)
      .maybeSingle();

    if (jobResult.error) {
      throw jobResult.error;
    }

    const job = jobResult.data as ReminderJobRow | null;

    if (!job?.id || !job.cart_id) {
      return jsonError(
        "JOB_NOT_FOUND",
        "لم يتم العثور على تذكير السلة داخل هذا المتجر.",
        404,
      );
    }

    const visitedAt = new Date().toISOString();

    const trackingResult = await markTrackingVisited({
      ordersDb,
      storeId,
      cartId: job.cart_id,
      request,
      visitedAt,
    });

    await Promise.all([
      markJobVisited({
        ordersDb,
        job,
        visitedAt,
      }),
      markStateVisited({
        ordersDb,
        storeId,
        cartId: job.cart_id,
        jobId: job.id,
        visitedAt,
      }),
    ]);

    return NextResponse.json(
      {
        ok: true,
        cart_id: job.cart_id,
        job_id: job.id,
        visited_after_reminder_at: visitedAt,
        tracking: trackingResult,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error: any) {
    return jsonError(
      "ABANDONED_VISIT_TRACK_FAILED",
      error?.message || "تعذر تسجيل زيارة السلة من التذكير.",
      500,
    );
  }
}