import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { getStoreDb } from "@/data/db/store-db.server";
import { verifySession } from "@/lib/auth/session";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store" };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: HEADERS });
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeEmail(value: unknown) {
  return text(value).toLowerCase();
}

function escapeHtml(value: unknown) {
  return text(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function moneyLabel(amount: number, currency: string) {
  const formatted = new Intl.NumberFormat("ar-SA", {
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} ${currency === "SAR" ? "ر.س" : currency}`;
}


function giftEmailShell(args: {
  title: string;
  subtitle: string;
  greeting: string;
  introHtml: string;
  amountLabel: string;
  amountValue: string;
  message?: string;
  balanceLabel?: string;
  balanceValue?: string;
  walletUrl: string;
  buttonLabel?: string;
}) {
  const messageBlock = args.message
    ? `
      <tr>
        <td style="padding:0 32px 16px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#FAFBFC;border:1px solid #E5E7EB;border-radius:18px;">
            <tr>
              <td style="padding:18px 20px;text-align:right;">
                <div style="font-size:12px;font-weight:700;color:#64748B;margin-bottom:8px;">رسالة الهدية</div>
                <div style="font-size:15px;line-height:1.9;color:#1F2933;white-space:pre-wrap;word-break:break-word;">${escapeHtml(args.message)}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `
    : "";

  const balanceBlock = args.balanceValue
    ? `
      <tr>
        <td style="padding:0 32px 20px;text-align:center;">
          <div style="font-size:14px;line-height:1.9;color:#64748B;">
            ${escapeHtml(args.balanceLabel || "الرصيد الحالي")}
            <strong style="display:inline-block;margin-right:6px;color:#0D3B45;font-size:17px;direction:ltr;">${escapeHtml(args.balanceValue)}</strong>
          </div>
        </td>
      </tr>
    `
    : "";

  return `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(args.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#F5F7F8;font-family:Arial,Tahoma,sans-serif;color:#1F2933;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F5F7F8;">
      <tr>
        <td align="center" style="padding:34px 14px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:620px;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:24px;overflow:hidden;box-shadow:0 18px 50px rgba(15,23,42,.08);">
            <tr>
              <td style="padding:34px 32px;text-align:center;background:#0D3B45;">
                <table width="68" height="68" cellpadding="0" cellspacing="0" role="presentation" align="center" style="width:68px;height:68px;background:#FFFFFF;border-radius:20px;margin:0 auto 16px;">
                  <tr>
                    <td align="center" valign="middle" style="font-size:30px;line-height:68px;">🎁</td>
                  </tr>
                </table>
                <div style="font-size:26px;font-weight:800;line-height:1.5;color:#FFFFFF;">${escapeHtml(args.title)}</div>
                <div style="margin-top:8px;font-size:14px;line-height:1.8;color:#BFE6D8;">${escapeHtml(args.subtitle)}</div>
              </td>
            </tr>

            <tr>
              <td style="padding:34px 32px 14px;text-align:right;">
                <div style="font-size:17px;font-weight:700;color:#1F2933;margin-bottom:14px;">${escapeHtml(args.greeting)}</div>
                <div style="font-size:15px;line-height:2;color:#475569;">${args.introHtml}</div>
              </td>
            </tr>

            <tr>
              <td style="padding:0 32px 18px;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F0FAF6;border:1px solid #CCEBDD;border-radius:20px;">
                  <tr>
                    <td style="padding:22px;text-align:center;">
                      <div style="font-size:13px;color:#64748B;margin-bottom:6px;">${escapeHtml(args.amountLabel)}</div>
                      <div style="font-size:34px;font-weight:900;color:#0D3B45;direction:ltr;">${escapeHtml(args.amountValue)}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            ${messageBlock}
            ${balanceBlock}

            <tr>
              <td align="center" style="padding:0 32px 34px;">
                <a href="${escapeHtml(args.walletUrl)}" style="display:inline-block;background:#0D3B45;color:#FFFFFF;text-decoration:none;padding:14px 30px;border-radius:14px;font-size:15px;font-weight:800;">${escapeHtml(args.buttonLabel || "عرض المحفظة")}</a>
              </td>
            </tr>

            <tr>
              <td style="padding:22px 32px;text-align:center;background:#FAFBFC;border-top:1px solid #EDF0F2;">
                <div style="font-size:16px;font-weight:800;color:#0D3B45;">متجر إيلافيا</div>
                <div style="margin-top:6px;font-size:12px;line-height:1.8;color:#94A3B8;">تم إرسال هذا البريد تلقائيًا لإشعارك بحركة مالية في محفظتك.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function sendGiftEmail(args: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM;

  if (!apiKey || !from || !args.to) {
    return { ok: false, skipped: true as const };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.message || "RESEND_SEND_FAILED");
  }

  return { ok: true, skipped: false as const };
}

function normalizeSaudiPhoneCandidates(value: unknown) {
  const digits = text(value).replace(/\D/g, "");
  if (!digits) return [] as string[];

  const candidates = new Set<string>();
  candidates.add(digits);

  if (digits.startsWith("00966")) {
    candidates.add(`+966${digits.slice(5)}`);
    candidates.add(`966${digits.slice(5)}`);
    candidates.add(`0${digits.slice(5)}`);
  } else if (digits.startsWith("966")) {
    candidates.add(`+${digits}`);
    candidates.add(`0${digits.slice(3)}`);
  } else if (digits.startsWith("05")) {
    candidates.add(`+966${digits.slice(1)}`);
    candidates.add(`966${digits.slice(1)}`);
  } else if (digits.startsWith("5") && digits.length === 9) {
    candidates.add(`+966${digits}`);
    candidates.add(`966${digits}`);
    candidates.add(`0${digits}`);
  }

  return Array.from(candidates);
}

async function getContext() {
  const store = await resolveStoreContext();
  const storeId = text(store?.store?.id);
  if (!storeId) {
    return { error: json({ ok: false, error: "STORE_NOT_FOUND" }, 404) } as const;
  }

  const cookieStore = await cookies();
  const token =
    cookieStore.get("elyaia_session")?.value ||
    cookieStore.get("elyaiaSession")?.value ||
    "";

  if (!token) {
    return { error: json({ ok: false, error: "UNAUTHENTICATED" }, 401) } as const;
  }

  let session: any = null;
  try {
    session = await Promise.resolve(verifySession(token) as any);
  } catch {
    session = null;
  }

  const db: any = await getStoreDb(storeId);
  let customerId = text(session?.customer_id);

  if (!customerId && (session?.auth_user_id || session?.user_id)) {
    const result = await db
      .from("customers")
      .select("id")
      .eq("auth_user_id", text(session.auth_user_id || session.user_id))
      .maybeSingle();
    customerId = text(result.data?.id);
  }

  if (!customerId) {
    return { error: json({ ok: false, error: "UNAUTHENTICATED" }, 401) } as const;
  }

  return {
    storeId,
    customerId,
    db,
    currency: text(store?.store?.default_currency || "SAR").toUpperCase(),
  } as const;
}

async function customerBelongsToStore(db: any, storeId: string, customerId: string) {
  const link = await db
    .from("store_customers")
    .select("customer_id")
    .eq("store_id", storeId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (link.error) throw link.error;
  if (link.data?.customer_id) return true;

  const order = await db
    .from("orders")
    .select("id")
    .eq("store_id", storeId)
    .eq("customer_id", customerId)
    .limit(1)
    .maybeSingle();

  if (order.error) throw order.error;
  return Boolean(order.data?.id);
}

async function findRecipient(db: any, storeId: string, recipient: string) {
  const email = normalizeEmail(recipient);
  const phoneCandidates = normalizeSaudiPhoneCandidates(recipient);

  let customer: any = null;

  if (email.includes("@")) {
    const result = await db
      .from("customers")
      .select("id,full_name,email,phone_e164")
      .eq("email", email)
      .maybeSingle();
    if (result.error) throw result.error;
    customer = result.data;
  } else {
    for (const phone of phoneCandidates) {
      const result = await db
        .from("customers")
        .select("id,full_name,email,phone_e164")
        .eq("phone_e164", phone)
        .maybeSingle();
      if (result.error) throw result.error;
      if (result.data?.id) {
        customer = result.data;
        break;
      }
    }
  }

  if (!customer?.id) return null;
  const linked = await customerBelongsToStore(db, storeId, text(customer.id));
  return linked ? customer : null;
}

export async function GET() {
  try {
    const context = await getContext();
    if ("error" in context) return context.error;

    const [settingsResult, walletResult, giftsResult] = await Promise.all([
      context.db
        .from("store_wallet_settings")
        .select("wallet_enabled,gifting_enabled,metadata")
        .eq("store_id", context.storeId)
        .maybeSingle(),
      context.db
        .from("customer_wallets")
        .select("currency,available_balance,status")
        .eq("store_id", context.storeId)
        .eq("customer_id", context.customerId)
        .eq("currency", context.currency)
        .maybeSingle(),
      context.db
        .from("customer_wallet_gifts")
        .select(
          "id,sender_customer_id,recipient_customer_id,amount,currency,message,status,completed_at,created_at",
        )
        .eq("store_id", context.storeId)
        .or(
          `sender_customer_id.eq.${context.customerId},recipient_customer_id.eq.${context.customerId}`,
        )
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    if (settingsResult.error) throw settingsResult.error;
    if (walletResult.error) throw walletResult.error;
    if (giftsResult.error) throw giftsResult.error;

    const gifts = Array.isArray(giftsResult.data) ? giftsResult.data : [];
    const customerIds = Array.from(
      new Set(
        gifts
          .flatMap((gift: any) => [gift.sender_customer_id, gift.recipient_customer_id])
          .map(text)
          .filter(Boolean),
      ),
    );

    const customersResult = customerIds.length
      ? await context.db
          .from("customers")
          .select("id,full_name,email,phone_e164")
          .in("id", customerIds)
      : { data: [], error: null };

    if (customersResult.error) throw customersResult.error;

    const customerMap = new Map<string, any>();
    for (const customer of Array.isArray(customersResult.data)
      ? customersResult.data
      : []) {
      customerMap.set(text(customer.id), customer);
    }

    return json({
      ok: true,
      settings: {
        wallet_enabled: settingsResult.data?.wallet_enabled ?? true,
        gifting_enabled: settingsResult.data?.gifting_enabled ?? false,
        gift_preset_amounts: Array.isArray((settingsResult.data?.metadata as any)?.gift_preset_amounts)
          ? (settingsResult.data?.metadata as any).gift_preset_amounts
              .map((value: unknown) => Number(value))
              .filter((value: number) => Number.isFinite(value) && value > 0)
              .slice(0, 6)
          : [],
      },
      wallet: {
        currency: text(walletResult.data?.currency || context.currency),
        available_balance: numberValue(walletResult.data?.available_balance),
        status: text(walletResult.data?.status || "active"),
      },
      gifts: gifts.map((gift: any) => {
        const sent = text(gift.sender_customer_id) === context.customerId;
        const otherCustomer = customerMap.get(
          sent ? text(gift.recipient_customer_id) : text(gift.sender_customer_id),
        );

        return {
          id: text(gift.id),
          direction: sent ? "sent" : "received",
          amount: numberValue(gift.amount),
          currency: text(gift.currency || context.currency),
          message: gift.message ? text(gift.message) : null,
          status: text(gift.status || "pending"),
          created_at: gift.completed_at ?? gift.created_at ?? null,
          customer: {
            id: text(otherCustomer?.id),
            name: text(otherCustomer?.full_name) || "عميل",
            email: text(otherCustomer?.email) || null,
            phone: text(otherCustomer?.phone_e164) || null,
          },
        };
      }),
    });
  } catch (error) {
    console.error("[wallet/gifts][GET]", error);
    return json({ ok: false, error: "GIFTS_LOAD_FAILED" }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getContext();
    if ("error" in context) return context.error;

    const body = await request.json().catch(() => ({}));
    const recipient = text(body.recipient);
    const amount = Math.round(numberValue(body.amount) * 100) / 100;
    const displayAmount = Math.round(numberValue(body.display_amount) * 10000) / 10000;
    const displayCurrency = text(body.display_currency).toUpperCase();
    const exchangeRateSnapshot = numberValue(body.exchange_rate_snapshot);
    const message = text(body.message).slice(0, 300);
    const idempotencyKey = text(body.idempotency_key);

    if (!recipient || amount <= 0) {
      return json({ ok: false, error: "INVALID_GIFT_DATA" }, 400);
    }

    if (!idempotencyKey) {
      return json({ ok: false, error: "IDEMPOTENCY_KEY_REQUIRED" }, 400);
    }

    const settings = await context.db
      .from("store_wallet_settings")
      .select("wallet_enabled,gifting_enabled")
      .eq("store_id", context.storeId)
      .maybeSingle();

    if (settings.error) throw settings.error;
    if (!settings.data?.wallet_enabled) {
      return json({ ok: false, error: "STORE_WALLET_DISABLED" }, 409);
    }
    if (!settings.data?.gifting_enabled) {
      return json({ ok: false, error: "WALLET_GIFTING_DISABLED" }, 409);
    }

    const wallet = await context.db
      .from("customer_wallets")
      .select("available_balance,status,currency")
      .eq("store_id", context.storeId)
      .eq("customer_id", context.customerId)
      .eq("currency", context.currency)
      .maybeSingle();

    if (wallet.error) throw wallet.error;
    if (text(wallet.data?.status || "active") !== "active") {
      return json({ ok: false, error: "CUSTOMER_WALLET_IS_NOT_ACTIVE" }, 409);
    }
    if (numberValue(wallet.data?.available_balance) < amount) {
      return json({ ok: false, error: "INSUFFICIENT_WALLET_BALANCE" }, 409);
    }

    const recipientCustomer = await findRecipient(
      context.db,
      context.storeId,
      recipient,
    );

    if (!recipientCustomer?.id) {
      return json({ ok: false, error: "RECIPIENT_NOT_FOUND" }, 404);
    }

    if (text(recipientCustomer.id) === context.customerId) {
      return json({ ok: false, error: "CANNOT_GIFT_TO_SELF" }, 409);
    }

    const senderResult = await context.db
      .from("customers")
      .select("id,full_name,email,phone_e164")
      .eq("id", context.customerId)
      .maybeSingle();

    if (senderResult.error) throw senderResult.error;
    const senderCustomer = senderResult.data ?? null;

    const result = await context.db.rpc("wallet_transfer_gift", {
      p_store_id: context.storeId,
      p_sender_customer_id: context.customerId,
      p_recipient_customer_id: text(recipientCustomer.id),
      p_amount: amount,
      p_currency: context.currency,
      p_message: message || null,
      p_idempotency_key: idempotencyKey,
      p_metadata: {
        source: "storefront_customer_wallet",
        recipient_lookup: recipient,
        base_amount: amount,
        base_currency: context.currency,
        display_amount: displayAmount > 0 ? displayAmount : null,
        display_currency: /^[A-Z]{3}$/.test(displayCurrency) ? displayCurrency : null,
        exchange_rate_snapshot: exchangeRateSnapshot > 0 ? exchangeRateSnapshot : null,
      },
    });

    if (result.error) throw result.error;

    const rpcResult =
      result.data && typeof result.data === "object"
        ? (result.data as Record<string, any>)
        : {};
    const isIdempotent = Boolean(rpcResult.idempotent);
    const senderName = text(senderCustomer?.full_name) || "أحد العملاء";
    const recipientName = text(recipientCustomer.full_name) || "العميل";
    const currency = context.currency;
    const walletUrl = new URL("/account/wallet", request.nextUrl.origin).toString();

    const emailResults: Array<{
      audience: string;
      ok: boolean;
      skipped?: boolean;
    }> = [];

    if (!isIdempotent) {
      const jobs: Array<
        Promise<{ audience: string; ok: boolean; skipped?: boolean }>
      > = [];

      if (text(recipientCustomer.email)) {
        jobs.push(
          sendGiftEmail({
            to: text(recipientCustomer.email),
            subject: `وصلك رصيد هدية بقيمة ${moneyLabel(amount, currency)} 🎁`,
            html: giftEmailShell({
              title: "وصلك رصيد هدية",
              subtitle: "تمت إضافة الرصيد مباشرة إلى محفظتك",
              greeting: `مرحبًا ${recipientName}،`,
              introHtml: `أرسل لك <strong style="color:#0D3B45;">${escapeHtml(senderName)}</strong> رصيدًا هدية.`,
              amountLabel: "قيمة الهدية",
              amountValue: moneyLabel(amount, currency),
              message: message || undefined,
              walletUrl,
            }),
          }).then((value) => ({ audience: "recipient", ...value })),
        );
      }

      if (text(senderCustomer?.email)) {
        const remainingBalance =
          numberValue(wallet.data?.available_balance) - amount;

        jobs.push(
          sendGiftEmail({
            to: text(senderCustomer.email),
            subject: `تم إرسال هدية الرصيد إلى ${recipientName} بنجاح`,
            html: giftEmailShell({
              title: "تم إرسال هدية الرصيد بنجاح",
              subtitle: "تم تنفيذ العملية وإضافة الرصيد إلى محفظة المستلم",
              greeting: `مرحبًا ${senderName}،`,
              introHtml: `تم إرسال الهدية إلى <strong style="color:#0D3B45;">${escapeHtml(recipientName)}</strong> بنجاح.`,
              amountLabel: "قيمة الهدية المرسلة",
              amountValue: moneyLabel(amount, currency),
              message: message || undefined,
              balanceLabel: "رصيدك المتبقي:",
              balanceValue: moneyLabel(Math.max(remainingBalance, 0), currency),
              walletUrl,
            }),
          }).then((value) => ({ audience: "sender", ...value })),
        );
      }

      const settled = await Promise.allSettled(jobs);
      for (const item of settled) {
        if (item.status === "fulfilled") {
          emailResults.push(item.value);
        } else {
          console.error("[wallet/gifts][email]", item.reason);
          emailResults.push({ audience: "unknown", ok: false });
        }
      }
    }

    return json(
      {
        ok: true,
        gift: result.data,
        idempotent: isIdempotent,
        recipient: {
          id: text(recipientCustomer.id),
          name: recipientName,
        },
        notifications: emailResults,
      },
      201,
    );
  } catch (error: any) {
    console.error("[wallet/gifts][POST]", error);
    return json(
      { ok: false, error: text(error?.message) || "GIFT_SEND_FAILED" },
      400,
    );
  }
}
