begin;

alter table public.abandoned_cart_offer_coupons
  add column if not exists redeemed_order_id uuid;

create unique index if not exists coupon_redemptions_unique_store_order_coupon
  on public.coupon_redemptions (store_id, order_id, coupon_id);

create index if not exists coupon_redemptions_store_coupon_customer_idx
  on public.coupon_redemptions (store_id, coupon_id, customer_id);

create or replace function public.checkout_reserve_coupon_redemption(
  p_store_id uuid,
  p_coupon_id uuid,
  p_order_id uuid,
  p_cart_id uuid,
  p_customer_id uuid default null,
  p_usage_limit integer default null,
  p_usage_limit_per_user integer default null,
  p_subtotal numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total bigint := 0;
  v_per_user bigint := 0;
  v_existing_id uuid;
  v_offer record;
begin
  if p_store_id is null or p_coupon_id is null or p_order_id is null then
    return jsonb_build_object('ok', false, 'error', 'INVALID_COUPON_RESERVATION');
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_store_id::text || ':' || p_coupon_id::text, 0)
  );

  select id
    into v_existing_id
    from public.coupon_redemptions
   where store_id = p_store_id
     and coupon_id = p_coupon_id
     and order_id = p_order_id
   limit 1;

  if v_existing_id is not null then
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'redemption_id', v_existing_id
    );
  end if;

  if coalesce(p_usage_limit, 0) > 0 then
    select count(*)
      into v_total
      from public.coupon_redemptions
     where store_id = p_store_id
       and coupon_id = p_coupon_id;

    if v_total >= p_usage_limit then
      return jsonb_build_object('ok', false, 'error', 'USAGE_LIMIT_REACHED');
    end if;
  end if;

  if coalesce(p_usage_limit_per_user, 0) > 0 then
    if p_customer_id is null then
      return jsonb_build_object(
        'ok', false,
        'error', 'LOGIN_REQUIRED_FOR_THIS_COUPON'
      );
    end if;

    select count(*)
      into v_per_user
      from public.coupon_redemptions
     where store_id = p_store_id
       and coupon_id = p_coupon_id
       and customer_id = p_customer_id;

    if v_per_user >= p_usage_limit_per_user then
      return jsonb_build_object(
        'ok', false,
        'error', 'USAGE_LIMIT_PER_USER_REACHED'
      );
    end if;
  end if;

  select id, cart_id, expires_at, used_at, max_cart_total, redeemed_order_id
    into v_offer
    from public.abandoned_cart_offer_coupons
   where store_id = p_store_id
     and coupon_id = p_coupon_id
   order by created_at desc
   limit 1
   for update;

  if found then
    if v_offer.cart_id is distinct from p_cart_id then
      return jsonb_build_object(
        'ok', false,
        'error', 'ABANDONED_OFFER_CART_MISMATCH'
      );
    end if;

    if v_offer.used_at is not null and
       v_offer.redeemed_order_id is distinct from p_order_id then
      return jsonb_build_object(
        'ok', false,
        'error', 'ABANDONED_OFFER_USED'
      );
    end if;

    if v_offer.expires_at is not null and v_offer.expires_at < now() then
      return jsonb_build_object(
        'ok', false,
        'error', 'ABANDONED_OFFER_EXPIRED'
      );
    end if;

    if coalesce(v_offer.max_cart_total, 0) > 0 and
       coalesce(p_subtotal, 0) > v_offer.max_cart_total then
      return jsonb_build_object(
        'ok', false,
        'error', 'ABANDONED_OFFER_MAX_TOTAL'
      );
    end if;
  end if;

  insert into public.coupon_redemptions (
    store_id,
    coupon_id,
    order_id,
    customer_id
  )
  values (
    p_store_id,
    p_coupon_id,
    p_order_id,
    p_customer_id
  )
  returning id into v_existing_id;

  if v_offer.id is not null then
    update public.abandoned_cart_offer_coupons
       set used_at = coalesce(used_at, now()),
           redeemed_order_id = p_order_id
     where id = v_offer.id
       and store_id = p_store_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'redemption_id', v_existing_id
  );
exception
  when unique_violation then
    select id
      into v_existing_id
      from public.coupon_redemptions
     where store_id = p_store_id
       and coupon_id = p_coupon_id
       and order_id = p_order_id
     limit 1;

    if v_existing_id is not null then
      return jsonb_build_object(
        'ok', true,
        'idempotent', true,
        'redemption_id', v_existing_id
      );
    end if;

    raise;
end;
$$;

create or replace function public.checkout_release_coupon_redemption(
  p_store_id uuid,
  p_order_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted bigint := 0;
  v_released_offer bigint := 0;
begin
  delete from public.coupon_redemptions
   where store_id = p_store_id
     and order_id = p_order_id;

  get diagnostics v_deleted = row_count;

  update public.abandoned_cart_offer_coupons
     set used_at = null,
         redeemed_order_id = null
   where store_id = p_store_id
     and redeemed_order_id = p_order_id;

  get diagnostics v_released_offer = row_count;

  return jsonb_build_object(
    'ok', true,
    'deleted_redemptions', v_deleted,
    'released_abandoned_offers', v_released_offer
  );
end;
$$;

revoke all on function public.checkout_reserve_coupon_redemption(
  uuid, uuid, uuid, uuid, uuid, integer, integer, numeric
) from public, anon, authenticated;

revoke all on function public.checkout_release_coupon_redemption(
  uuid, uuid
) from public, anon, authenticated;

grant execute on function public.checkout_reserve_coupon_redemption(
  uuid, uuid, uuid, uuid, uuid, integer, integer, numeric
) to service_role;

grant execute on function public.checkout_release_coupon_redemption(
  uuid, uuid
) to service_role;

commit;
