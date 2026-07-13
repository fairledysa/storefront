# Moyasar Wallet Top-up Setup

The wallet top-up integration is fully scaffolded and remains disabled until Moyasar keys are provided.

## Environment variables (apps/storefront)

```env
MOYASAR_ENABLED=false
NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY=
MOYASAR_SECRET_KEY=
MOYASAR_WEBHOOK_SECRET=
MOYASAR_API_BASE_URL=https://api.moyasar.com/v1
PLATFORM_PUBLIC_URL=https://e.elyaia.com
MOYASAR_WEBHOOK_URL=https://e.elyaia.com/api/webhooks/moyasar
```

The callback URL is generated dynamically from the current store origin and is not stored in env.

## When the account is activated

1. Add test keys and set `MOYASAR_ENABLED=true`.
2. In Moyasar Dashboard, create one webhook:
   - URL: value of `MOYASAR_WEBHOOK_URL`
   - Shared secret: same value as `MOYASAR_WEBHOOK_SECRET`
   - Events: `payment_paid`, `payment_failed`, `payment_refunded`
3. Enable `topup_enabled` from Merchant > Wallet settings.
4. Test with Sandbox before using live keys.

## Routes

- Create/attach session: `/api/account/wallet/topup`
- Dynamic callback: `/api/account/wallet/topup/callback`
- Central webhook: `/api/webhooks/moyasar`
- Merchant reconciliation: `/wallet/topups`

No wallet credit is created from the browser redirect alone. The server fetches the payment from Moyasar and validates status, amount, currency, store, customer and top-up session before calling `wallet_complete_topup`.
