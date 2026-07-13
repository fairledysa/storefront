import "server-only";

import { controlDb } from "@/data/db/control-db.server";

type Input = {
  storeId: string;
  ticketId: string;
  publicNo?: string | number | null;
  subject: string;
  kind: "ticket_created" | "customer_replied";
  customerName?: string | null;
  messagePreview?: string | null;
};

function s(value: unknown) {
  return String(value ?? "").trim();
}

export async function createTicketMerchantNotification(input: Input) {
  const db: any = controlDb();
  const storeId = s(input.storeId);
  const ticketId = s(input.ticketId);
  if (!storeId || !ticketId) return;

  const publicNo = s(input.publicNo);
  const ticketLabel = publicNo ? `#TK-${publicNo}` : "تذكرة دعم";
  const dedupeKey = `${input.kind}:${storeId}:${ticketId}:${s(input.messagePreview).slice(0, 80)}`;

  const existing = await db
    .from("merchant_notifications")
    .select("id")
    .eq("store_id", storeId)
    .eq("dedupe_key", dedupeKey)
    .limit(1)
    .maybeSingle();

  let notificationId = s(existing.data?.id);

  if (!notificationId) {
    const title = input.kind === "ticket_created"
      ? `تذكرة دعم جديدة ${ticketLabel}`
      : `رد جديد من العميل على ${ticketLabel}`;

    const customerName = s(input.customerName) || "عميل";
    const subject = s(input.subject) || "بدون عنوان";
    const preview = s(input.messagePreview).slice(0, 180);
    const body = input.kind === "ticket_created"
      ? `${customerName}: ${subject}`
      : `${customerName}: ${preview || subject}`;

    const inserted = await db
      .from("merchant_notifications")
      .insert({
        store_id: storeId,
        type: "system",
        source: "storefront",
        entity_type: "system",
        entity_id: ticketId,
        title,
        body,
        action_path: "/support/tickets",
        priority: "high",
        dedupe_key: dedupeKey,
        payload: {
          feature: "support_tickets",
          ticket_id: ticketId,
          ticket_public_no: publicNo || null,
          event: input.kind,
        },
      })
      .select("id")
      .single();

    if (inserted.error || !inserted.data?.id) return;
    notificationId = s(inserted.data.id);
  }

  const usersR = await db
    .from("store_users")
    .select("id,role")
    .eq("store_id", storeId)
    .eq("status", "active");
  if (usersR.error) return;

  const users = (usersR.data || [])
    .map((row: any) => ({ id: s(row.id), role: s(row.role).toLowerCase() }))
    .filter((row: any) => row.id);
  if (!users.length) return;

  const eligible = new Set<string>(
    users.filter((u: any) => u.role === "owner" || u.role === "admin").map((u: any) => u.id),
  );

  const relationsR = await db
    .from("store_user_roles")
    .select("user_id,role_id,role:store_roles!inner(code,status)")
    .in("user_id", users.map((u: any) => u.id));

  const relations = (relationsR.data || []).filter(
    (row: any) => s(row?.role?.status || "active") === "active",
  );

  for (const row of relations) {
    if (s((row as any)?.role?.code).toLowerCase() === "owner") {
      eligible.add(s((row as any).user_id));
    }
  }

  const roleIds = Array.from(new Set(relations.map((r: any) => s(r.role_id)).filter(Boolean)));
  if (roleIds.length) {
    const permissionsR = await db
      .from("store_role_permissions")
      .select("role_id,permission:store_permissions!inner(key)")
      .in("role_id", roleIds);

    const permittedRoleIds = new Set(
      (permissionsR.data || [])
        .filter((row: any) => s(row?.permission?.key) === "support.tickets.view")
        .map((row: any) => s(row.role_id)),
    );

    for (const row of relations) {
      if (permittedRoleIds.has(s((row as any).role_id))) {
        eligible.add(s((row as any).user_id));
      }
    }
  }

  const rows = Array.from(eligible).filter(Boolean).map((storeUserId) => ({
    notification_id: notificationId,
    store_id: storeId,
    store_user_id: storeUserId,
  }));

  if (!rows.length) return;

  await db.from("merchant_notification_recipients").upsert(rows, {
    onConflict: "notification_id,store_user_id",
    ignoreDuplicates: true,
  });
}
