-- Approved Sales + Stock domain for Tani Jaya.
-- Purchase remains the stock source; this migration adds only a grade to its
-- item rows and does not alter Purchase weighing or valuation formulas.

alter table public.transaction_items
  add column grade text not null check (grade in ('SP', 'TG', 'BR'));

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  sale_number text not null unique check (sale_number ~ '^PJ-[0-9]{8}-[0-9]{4}$'),
  sale_date date not null,
  buyer_name text not null check (length(btrim(buyer_name)) > 0),
  buyer_type text not null check (buyer_type in ('general_buyer', 'weigher_collector', 'market')),
  delivery_method text not null check (delivery_method in ('buyer_pickup', 'expedition')),
  expedition_name text,
  expedition_rate_per_kg bigint,
  total_gross_weight_kg integer not null default 0 check (total_gross_weight_kg >= 0),
  total_deduction_weight_kg integer not null default 0 check (
    total_deduction_weight_kg >= 0
    and total_deduction_weight_kg <= total_gross_weight_kg
  ),
  total_net_weight_kg integer not null default 0 check (
    total_net_weight_kg = total_gross_weight_kg - total_deduction_weight_kg
  ),
  total_amount bigint not null default 0 check (total_amount >= 0),
  expedition_cost bigint generated always as (
    case
      when delivery_method = 'expedition'
        then total_gross_weight_kg::bigint * expedition_rate_per_kg
      else 0::bigint
    end
  ) stored,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  cancellation_reason text,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (delivery_method = 'buyer_pickup'
      and expedition_name is null
      and expedition_rate_per_kg is null)
    or
    (delivery_method = 'expedition'
      and length(btrim(coalesce(expedition_name, ''))) > 0
      and expedition_rate_per_kg is not null
      and expedition_rate_per_kg >= 0)
  ),
  check (
    (status = 'active'
      and cancellation_reason is null
      and cancelled_at is null)
    or
    (status = 'cancelled'
      and length(btrim(coalesce(cancellation_reason, ''))) > 0
      and cancelled_at is not null)
  )
);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  commodity text not null check (length(btrim(commodity)) > 0),
  grade text not null check (grade in ('SP', 'TG', 'BR')),
  gross_weight_kg integer not null check (gross_weight_kg > 0),
  deduction_weight_kg integer not null default 0 check (
    deduction_weight_kg >= 0
    and deduction_weight_kg <= gross_weight_kg
  ),
  net_weight_kg integer generated always as (gross_weight_kg - deduction_weight_kg) stored,
  price_per_kg bigint not null check (price_per_kg >= 0),
  subtotal bigint generated always as (
    (gross_weight_kg - deduction_weight_kg)::bigint * price_per_kg
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sale_stock_allocations (
  id uuid primary key default gen_random_uuid(),
  sale_item_id uuid not null references public.sale_items (id) on delete cascade,
  purchase_item_id uuid not null references public.transaction_items (id) on delete restrict,
  purchase_container_weight_id uuid references public.transaction_container_weights (id) on delete restrict,
  allocated_gross_weight_kg integer not null check (allocated_gross_weight_kg > 0),
  released_at timestamptz,
  release_reason text,
  created_at timestamptz not null default now(),
  check (
    (released_at is null and release_reason is null)
    or
    (released_at is not null and release_reason in ('sale_corrected', 'sale_cancelled'))
  )
);

create table public.sale_payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete restrict,
  payment_date date not null,
  amount bigint not null check (amount > 0),
  remaining_balance_after bigint not null check (remaining_balance_after >= 0),
  created_at timestamptz not null default now()
);

create table public.sale_change_events (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  event_type text not null check (event_type in ('corrected', 'cancelled')),
  reason text not null check (length(btrim(reason)) > 0),
  created_at timestamptz not null default now()
);

create table public.sale_number_counters (
  sale_date date primary key,
  last_sequence integer not null default 0 check (last_sequence between 0 and 9999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index sale_items_one_normalized_commodity_grade_per_sale
  on public.sale_items (sale_id, lower(btrim(commodity)), grade);
create index sales_sale_date_idx on public.sales (sale_date desc);
create index sales_status_sale_date_idx on public.sales (status, sale_date desc);
create index sales_buyer_name_search_idx
  on public.sales ((lower(btrim(buyer_name))) text_pattern_ops);
create index sale_items_sale_id_idx on public.sale_items (sale_id);
create index sale_items_commodity_grade_idx on public.sale_items (commodity, grade);
create index sale_stock_allocations_sale_item_id_idx
  on public.sale_stock_allocations (sale_item_id);
create index sale_stock_allocations_purchase_item_id_idx
  on public.sale_stock_allocations (purchase_item_id);
create index sale_stock_allocations_active_purchase_item_id_idx
  on public.sale_stock_allocations (purchase_item_id)
  where released_at is null;
create index sale_stock_allocations_purchase_container_weight_id_idx
  on public.sale_stock_allocations (purchase_container_weight_id);
create unique index sale_stock_allocations_one_active_container_idx
  on public.sale_stock_allocations (purchase_container_weight_id)
  where purchase_container_weight_id is not null and released_at is null;
create index sale_payments_sale_id_created_at_idx
  on public.sale_payments (sale_id, created_at, id);
create index sale_payments_payment_date_idx on public.sale_payments (payment_date desc);
create index sale_change_events_sale_id_created_at_idx
  on public.sale_change_events (sale_id, created_at desc);

create or replace function private.require_current_admin()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_current_admin()) then
    raise exception 'Admin authorization is required.' using errcode = '42501';
  end if;
end;
$$;

create or replace function private.refresh_sale_totals(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.sales
  set total_gross_weight_kg = coalesce((
        select sum(gross_weight_kg)
        from public.sale_items
        where sale_id = p_sale_id
      ), 0),
      total_deduction_weight_kg = coalesce((
        select sum(deduction_weight_kg)
        from public.sale_items
        where sale_id = p_sale_id
      ), 0),
      total_net_weight_kg = coalesce((
        select sum(net_weight_kg)
        from public.sale_items
        where sale_id = p_sale_id
      ), 0),
      total_amount = coalesce((
        select sum(subtotal)
        from public.sale_items
        where sale_id = p_sale_id
      ), 0)
  where id = p_sale_id;
end;
$$;

create or replace function public.sales_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger sales_set_updated_at
before update on public.sales
for each row execute function public.sales_set_updated_at();

create trigger sale_items_set_updated_at
before update on public.sale_items
for each row execute function public.sales_set_updated_at();

create trigger sale_number_counters_set_updated_at
before update on public.sale_number_counters
for each row execute function public.sales_set_updated_at();

create or replace function public.validate_sale_stock_allocation()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_sale_commodity text;
  v_sale_grade text;
  v_source_commodity text;
  v_source_grade text;
  v_weighing_method text;
  v_source_gross_weight integer;
  v_container_item_id uuid;
  v_container_weight integer;
  v_allocated_weight integer;
begin
  if tg_op = 'UPDATE'
    and old.released_at is not null
    and new.released_at is null then
    raise exception 'Released stock allocations cannot be reactivated.';
  end if;

  if new.released_at is not null and new.release_reason is null then
    raise exception 'A released allocation requires a release reason.';
  end if;

  select si.commodity, si.grade,
         ti.commodity, ti.grade, ti.weighing_method, ti.gross_weight_kg
    into v_sale_commodity, v_sale_grade,
         v_source_commodity, v_source_grade, v_weighing_method, v_source_gross_weight
  from public.sale_items si
  join public.transaction_items ti on ti.id = new.purchase_item_id
  join public.transactions t on t.id = ti.transaction_id
  where si.id = new.sale_item_id;

  if not found then
    raise exception 'Sale item or purchase source does not exist.';
  end if;

  if lower(btrim(v_sale_commodity)) <> lower(btrim(v_source_commodity))
    or v_sale_grade <> v_source_grade then
    raise exception 'Stock source commodity and grade must match the sale item.';
  end if;

  if new.purchase_container_weight_id is null then
    if v_weighing_method <> 'direct_total' then
      raise exception 'Only direct-total purchase items may receive partial kg allocations.';
    end if;

    if new.released_at is null then
      perform 1
      from public.transaction_items
      where id = new.purchase_item_id
      for update;

      select coalesce(sum(a.allocated_gross_weight_kg), 0)
        into v_allocated_weight
      from public.sale_stock_allocations a
      join public.sale_items existing_item on existing_item.id = a.sale_item_id
      join public.sales existing_sale on existing_sale.id = existing_item.sale_id
      where a.purchase_item_id = new.purchase_item_id
        and a.purchase_container_weight_id is null
        and a.released_at is null
        and existing_sale.status = 'active'
        and (tg_op = 'INSERT' or a.id <> new.id);

      if v_allocated_weight + new.allocated_gross_weight_kg > v_source_gross_weight then
        raise exception 'Direct stock allocation exceeds physical available stock.';
      end if;
    end if;
  else
    select transaction_item_id, weight_kg
      into v_container_item_id, v_container_weight
    from public.transaction_container_weights
    where id = new.purchase_container_weight_id
    for update;

    if not found
      or v_container_item_id <> new.purchase_item_id
      or v_weighing_method not in ('per_sack', 'per_crate')
      or new.allocated_gross_weight_kg <> v_container_weight then
      raise exception 'Container allocations must use the source container in full.';
    end if;
  end if;

  return new;
end;
$$;

create trigger sale_stock_allocations_validate
before insert or update on public.sale_stock_allocations
for each row execute function public.validate_sale_stock_allocation();

create or replace function public.validate_sale_payment()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_total_amount bigint;
  v_status text;
  v_paid_amount bigint;
  v_remaining bigint;
begin
  select total_amount, status
    into v_total_amount, v_status
  from public.sales
  where id = new.sale_id
  for update;

  if not found or v_status <> 'active' then
    raise exception 'Payments may be recorded only for an active sale.';
  end if;

  select coalesce(sum(amount), 0)
    into v_paid_amount
  from public.sale_payments
  where sale_id = new.sale_id;

  v_remaining := v_total_amount - v_paid_amount;
  if new.amount <= 0 or new.amount > v_remaining then
    raise exception 'Payment must be greater than zero and cannot exceed the remaining balance.';
  end if;

  new.remaining_balance_after := v_remaining - new.amount;
  return new;
end;
$$;

create trigger sale_payments_validate
before insert on public.sale_payments
for each row execute function public.validate_sale_payment();

create or replace function public.prevent_sale_payment_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Sale payment history is append-only.';
end;
$$;

create trigger sale_payments_prevent_update_or_delete
before update or delete on public.sale_payments
for each row execute function public.prevent_sale_payment_mutation();

create or replace function public.prevent_sale_change_event_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Sale change history is append-only.';
end;
$$;

create trigger sale_change_events_prevent_update_or_delete
before update or delete on public.sale_change_events
for each row execute function public.prevent_sale_change_event_mutation();

create or replace function public.prevent_purchase_source_change_after_sale_use()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
    and (old.commodity is distinct from new.commodity
      or old.grade is distinct from new.grade
      or old.weighing_method is distinct from new.weighing_method
      or old.gross_weight_kg is distinct from new.gross_weight_kg)
    and exists (
      select 1
      from public.sale_stock_allocations a
      where a.purchase_item_id = old.id
    ) then
    raise exception 'Purchase stock fields cannot change after Sales allocation history exists.';
  end if;
  return new;
end;
$$;

create trigger transaction_items_prevent_stock_source_change
before update on public.transaction_items
for each row execute function public.prevent_purchase_source_change_after_sale_use();

create or replace function public.prevent_purchase_container_change_after_sale_use()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_item_id uuid;
begin
  v_item_id := case when tg_op = 'DELETE' then old.transaction_item_id else new.transaction_item_id end;

  if exists (
    select 1
    from public.sale_stock_allocations a
    where a.purchase_item_id = v_item_id
  ) then
    raise exception 'Purchase containers cannot change after Sales allocation history exists.';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger transaction_container_weights_prevent_stock_source_change
before insert or update or delete on public.transaction_container_weights
for each row execute function public.prevent_purchase_container_change_after_sale_use();

create or replace function public.prevent_purchase_seller_change_after_sale_use()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (old.seller_type is distinct from new.seller_type
      or old.farmer_id is distinct from new.farmer_id
      or old.seller_name_snapshot is distinct from new.seller_name_snapshot)
    and exists (
      select 1
      from public.transaction_items ti
      join public.sale_stock_allocations a on a.purchase_item_id = ti.id
      where ti.transaction_id = old.id
    ) then
    raise exception 'Purchase seller identity cannot change after Sales allocation history exists.';
  end if;
  return new;
end;
$$;

create trigger transactions_prevent_stock_seller_change
before update on public.transactions
for each row execute function public.prevent_purchase_seller_change_after_sale_use();

create or replace function private.validate_sale_header(
  p_buyer_name text,
  p_buyer_type text,
  p_delivery_method text,
  p_expedition_name text,
  p_expedition_rate_per_kg bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if length(btrim(coalesce(p_buyer_name, ''))) = 0
    or p_buyer_type not in ('general_buyer', 'weigher_collector', 'market')
    or p_delivery_method not in ('buyer_pickup', 'expedition') then
    raise exception 'Sale buyer or delivery input is invalid.';
  end if;

  if (p_delivery_method = 'buyer_pickup'
      and (p_expedition_name is not null or p_expedition_rate_per_kg is not null))
    or (p_delivery_method = 'expedition'
      and (length(btrim(coalesce(p_expedition_name, ''))) = 0
        or p_expedition_rate_per_kg is null
        or p_expedition_rate_per_kg < 0)) then
    raise exception 'Expedition details must match the selected delivery method.';
  end if;
end;
$$;

create or replace function private.apply_sale_items(
  p_sale_id uuid,
  p_items jsonb,
  p_is_correction boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_line jsonb;
  v_allocation jsonb;
  v_commodity text;
  v_grade text;
  v_key text;
  v_keys text[] := '{}'::text[];
  v_deduction integer;
  v_price bigint;
  v_line_gross integer;
  v_allocation_weight integer;
  v_purchase_item_id uuid;
  v_container_id uuid;
  v_sale_item_id uuid;
  v_source_commodity text;
  v_source_grade text;
  v_weighing_method text;
  v_source_gross integer;
  v_existing_allocated integer;
  v_container_item_id uuid;
  v_container_weight integer;
  v_old_item_count integer;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'A sale requires at least one item.';
  end if;

  -- First validate the buyer-facing normalized keys before taking stock locks.
  for v_line in select value from jsonb_array_elements(p_items)
  loop
    v_commodity := btrim(coalesce(v_line ->> 'commodity', ''));
    v_grade := v_line ->> 'grade';
    if length(v_commodity) = 0 or v_grade not in ('SP', 'TG', 'BR') then
      raise exception 'Sale item commodity or grade is invalid.';
    end if;
    v_key := lower(v_commodity) || chr(31) || v_grade;
    if v_key = any(v_keys) then
      raise exception 'Each normalized commodity and grade may appear once per sale.';
    end if;
    v_keys := array_append(v_keys, v_key);
  end loop;

  if p_is_correction then
    select count(*) into v_old_item_count
    from public.sale_items
    where sale_id = p_sale_id;

    if v_old_item_count <> coalesce(array_length(v_keys, 1), 0)
      or exists (
        select 1
        from public.sale_items si
        where si.sale_id = p_sale_id
          and not ((lower(btrim(si.commodity)) || chr(31) || si.grade) = any(v_keys))
      ) then
      raise exception 'P0 corrections must retain the existing commodity and grade lines.';
    end if;
  end if;

  -- Lock all requested and, on correction, currently allocated purchase items
  -- in UUID order before changing allocations.
  for v_purchase_item_id in
    with requested as (
      select distinct (allocation.value ->> 'purchase_item_id')::uuid as id
      from jsonb_array_elements(p_items) line,
           jsonb_array_elements(line.value -> 'allocations') allocation
    ), existing as (
      select distinct a.purchase_item_id as id
      from public.sale_stock_allocations a
      join public.sale_items si on si.id = a.sale_item_id
      where p_is_correction and si.sale_id = p_sale_id and a.released_at is null
    )
    select id from requested
    union
    select id from existing
    order by id
  loop
    perform 1
    from public.transaction_items
    where id = v_purchase_item_id
    for update;
    if not found then
      raise exception 'A requested purchase stock source does not exist.';
    end if;
  end loop;

  -- Lock concrete containers in the same stable order. A container is never
  -- partially allocated; its specific existing row remains the stock source.
  for v_container_id in
    with requested as (
      select distinct nullif(allocation.value ->> 'purchase_container_weight_id', '')::uuid as id
      from jsonb_array_elements(p_items) line,
           jsonb_array_elements(line.value -> 'allocations') allocation
      where nullif(allocation.value ->> 'purchase_container_weight_id', '') is not null
    ), existing as (
      select distinct a.purchase_container_weight_id as id
      from public.sale_stock_allocations a
      join public.sale_items si on si.id = a.sale_item_id
      where p_is_correction
        and si.sale_id = p_sale_id
        and a.released_at is null
        and a.purchase_container_weight_id is not null
    )
    select id from requested
    union
    select id from existing
    order by id
  loop
    perform 1
    from public.transaction_container_weights
    where id = v_container_id
    for update;
    if not found then
      raise exception 'A requested purchase container does not exist.';
    end if;
  end loop;

  if p_is_correction then
    update public.sale_stock_allocations a
    set released_at = now(),
        release_reason = 'sale_corrected'
    from public.sale_items si
    where si.id = a.sale_item_id
      and si.sale_id = p_sale_id
      and a.released_at is null;
  end if;

  for v_line in select value from jsonb_array_elements(p_items)
  loop
    v_commodity := btrim(v_line ->> 'commodity');
    v_grade := v_line ->> 'grade';
    v_deduction := (v_line ->> 'deduction_weight_kg')::integer;
    v_price := (v_line ->> 'price_per_kg')::bigint;
    v_line_gross := 0;

    if v_deduction is null or v_price is null or v_deduction < 0 or v_price < 0
      or jsonb_typeof(v_line -> 'allocations') <> 'array'
      or jsonb_array_length(v_line -> 'allocations') = 0 then
      raise exception 'Sale item weights, price, or allocations are invalid.';
    end if;

    for v_allocation in select value from jsonb_array_elements(v_line -> 'allocations')
    loop
      v_purchase_item_id := (v_allocation ->> 'purchase_item_id')::uuid;
      v_container_id := nullif(v_allocation ->> 'purchase_container_weight_id', '')::uuid;
      v_allocation_weight := (v_allocation ->> 'allocated_gross_weight_kg')::integer;
      if v_allocation_weight is null or v_allocation_weight <= 0 then
        raise exception 'Allocated physical weight must be a positive whole kilogram.';
      end if;

      select ti.commodity, ti.grade, ti.weighing_method, ti.gross_weight_kg
        into v_source_commodity, v_source_grade, v_weighing_method, v_source_gross
      from public.transaction_items ti
      join public.transactions t on t.id = ti.transaction_id
      where ti.id = v_purchase_item_id;
      if not found
        or lower(btrim(v_source_commodity)) <> lower(v_commodity)
        or v_source_grade <> v_grade then
        raise exception 'Allocated purchase stock must match the sale commodity and grade.';
      end if;

      if v_container_id is null then
        if v_weighing_method <> 'direct_total' then
          raise exception 'A sack or crate must be allocated by its exact container.';
        end if;

        select coalesce(sum(a.allocated_gross_weight_kg), 0)
          into v_existing_allocated
        from public.sale_stock_allocations a
        join public.sale_items si on si.id = a.sale_item_id
        join public.sales s on s.id = si.sale_id
        where a.purchase_item_id = v_purchase_item_id
          and a.purchase_container_weight_id is null
          and a.released_at is null
          and s.status = 'active';
        if v_existing_allocated + v_allocation_weight > v_source_gross then
          raise exception 'Direct stock allocation exceeds physical available stock.';
        end if;
      else
        select transaction_item_id, weight_kg
          into v_container_item_id, v_container_weight
        from public.transaction_container_weights
        where id = v_container_id;
        if not found
          or v_container_item_id <> v_purchase_item_id
          or v_weighing_method not in ('per_sack', 'per_crate')
          or v_allocation_weight <> v_container_weight then
          raise exception 'A container allocation must use its full source container weight.';
        end if;
      end if;

      v_line_gross := v_line_gross + v_allocation_weight;
    end loop;

    if v_deduction > v_line_gross then
      raise exception 'Sale deduction cannot exceed gross physical weight.';
    end if;

    if p_is_correction then
      select id into v_sale_item_id
      from public.sale_items
      where sale_id = p_sale_id
        and lower(btrim(commodity)) = lower(v_commodity)
        and grade = v_grade
      for update;

      update public.sale_items
      set commodity = v_commodity,
          gross_weight_kg = v_line_gross,
          deduction_weight_kg = v_deduction,
          price_per_kg = v_price
      where id = v_sale_item_id;
    else
      insert into public.sale_items (
        sale_id, commodity, grade, gross_weight_kg, deduction_weight_kg, price_per_kg
      ) values (
        p_sale_id, v_commodity, v_grade, v_line_gross, v_deduction, v_price
      ) returning id into v_sale_item_id;
    end if;

    for v_allocation in select value from jsonb_array_elements(v_line -> 'allocations')
    loop
      insert into public.sale_stock_allocations (
        sale_item_id, purchase_item_id, purchase_container_weight_id, allocated_gross_weight_kg
      ) values (
        v_sale_item_id,
        (v_allocation ->> 'purchase_item_id')::uuid,
        nullif(v_allocation ->> 'purchase_container_weight_id', '')::uuid,
        (v_allocation ->> 'allocated_gross_weight_kg')::integer
      );
    end loop;
  end loop;

  perform private.refresh_sale_totals(p_sale_id);

  if exists (
    select 1
    from public.sale_items si
    left join lateral (
      select coalesce(sum(a.allocated_gross_weight_kg), 0) as active_allocated_weight
      from public.sale_stock_allocations a
      where a.sale_item_id = si.id
        and a.released_at is null
    ) allocation_total on true
    where si.sale_id = p_sale_id
      and allocation_total.active_allocated_weight <> si.gross_weight_kg
  ) then
    raise exception 'Active stock allocations must exactly equal each sale item gross weight.';
  end if;
end;
$$;

create or replace function private.create_sale(
  p_sale_date date,
  p_buyer_name text,
  p_buyer_type text,
  p_delivery_method text,
  p_expedition_name text,
  p_expedition_rate_per_kg bigint,
  p_items jsonb,
  p_initial_payment_amount bigint default 0
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sequence integer;
  v_sale_number text;
  v_sale_id uuid;
begin
  perform private.require_current_admin();
  perform private.validate_sale_header(
    p_buyer_name, p_buyer_type, p_delivery_method,
    p_expedition_name, p_expedition_rate_per_kg
  );
  if p_sale_date is null or coalesce(p_initial_payment_amount, 0) < 0 then
    raise exception 'Sale date or initial payment is invalid.';
  end if;

  insert into public.sale_number_counters (sale_date, last_sequence)
  values (p_sale_date, 1)
  on conflict (sale_date) do update
    set last_sequence = public.sale_number_counters.last_sequence + 1
  returning last_sequence into v_sequence;

  if v_sequence > 9999 then
    raise exception 'The daily Sale number sequence exceeded four digits.';
  end if;

  v_sale_number := 'PJ-' || to_char(p_sale_date, 'YYYYMMDD') || '-' || lpad(v_sequence::text, 4, '0');

  insert into public.sales (
    sale_number, sale_date, buyer_name, buyer_type, delivery_method,
    expedition_name, expedition_rate_per_kg
  ) values (
    v_sale_number, p_sale_date, btrim(p_buyer_name), p_buyer_type, p_delivery_method,
    case when p_delivery_method = 'expedition' then btrim(p_expedition_name) else null end,
    case when p_delivery_method = 'expedition' then p_expedition_rate_per_kg else null end
  ) returning id into v_sale_id;

  perform private.apply_sale_items(v_sale_id, p_items, false);

  if coalesce(p_initial_payment_amount, 0) > 0 then
    insert into public.sale_payments (sale_id, payment_date, amount, remaining_balance_after)
    values (v_sale_id, p_sale_date, p_initial_payment_amount, 0);
  end if;

  return v_sale_id;
end;
$$;

create or replace function private.record_sale_payment(
  p_sale_id uuid,
  p_payment_date date,
  p_amount bigint
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment_id uuid;
begin
  perform private.require_current_admin();
  if p_payment_date is null or p_amount is null or p_amount <= 0 then
    raise exception 'Payment date and amount are invalid.';
  end if;

  insert into public.sale_payments (sale_id, payment_date, amount, remaining_balance_after)
  values (p_sale_id, p_payment_date, p_amount, 0)
  returning id into v_payment_id;

  return v_payment_id;
end;
$$;

create or replace function private.correct_sale(
  p_sale_id uuid,
  p_buyer_name text,
  p_buyer_type text,
  p_delivery_method text,
  p_expedition_name text,
  p_expedition_rate_per_kg bigint,
  p_items jsonb,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_paid_amount bigint;
  v_total_amount bigint;
begin
  perform private.require_current_admin();
  perform private.validate_sale_header(
    p_buyer_name, p_buyer_type, p_delivery_method,
    p_expedition_name, p_expedition_rate_per_kg
  );
  if length(btrim(coalesce(p_reason, ''))) = 0 then
    raise exception 'A correction reason is required.';
  end if;

  select status into v_status
  from public.sales
  where id = p_sale_id
  for update;
  if not found or v_status <> 'active' then
    raise exception 'Only an active sale may be corrected.';
  end if;

  perform private.apply_sale_items(p_sale_id, p_items, true);

  select total_amount into v_total_amount
  from public.sales
  where id = p_sale_id;
  select coalesce(sum(amount), 0) into v_paid_amount
  from public.sale_payments
  where sale_id = p_sale_id;
  if v_total_amount < v_paid_amount then
    raise exception 'A corrected sale total cannot be below cash already received.';
  end if;

  update public.sales
  set buyer_name = btrim(p_buyer_name),
      buyer_type = p_buyer_type,
      delivery_method = p_delivery_method,
      expedition_name = case when p_delivery_method = 'expedition' then btrim(p_expedition_name) else null end,
      expedition_rate_per_kg = case when p_delivery_method = 'expedition' then p_expedition_rate_per_kg else null end
  where id = p_sale_id;

  insert into public.sale_change_events (sale_id, event_type, reason)
  values (p_sale_id, 'corrected', btrim(p_reason));

  return p_sale_id;
end;
$$;

create or replace function private.cancel_sale(
  p_sale_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  perform private.require_current_admin();
  if length(btrim(coalesce(p_reason, ''))) = 0 then
    raise exception 'A cancellation reason is required.';
  end if;

  select status into v_status
  from public.sales
  where id = p_sale_id
  for update;
  if not found or v_status <> 'active' then
    raise exception 'Only an active sale may be cancelled.';
  end if;

  update public.sale_stock_allocations a
  set released_at = now(),
      release_reason = 'sale_cancelled'
  from public.sale_items si
  where si.id = a.sale_item_id
    and si.sale_id = p_sale_id
    and a.released_at is null;

  update public.sales
  set status = 'cancelled',
      cancellation_reason = btrim(p_reason),
      cancelled_at = now()
  where id = p_sale_id;

  insert into public.sale_change_events (sale_id, event_type, reason)
  values (p_sale_id, 'cancelled', btrim(p_reason));

  return p_sale_id;
end;
$$;

create or replace function private.delete_sale_without_payments(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_current_admin();
  perform 1
  from public.sales
  where id = p_sale_id
  for update;
  if not found then
    raise exception 'Sale does not exist.';
  end if;

  if exists (select 1 from public.sale_payments where sale_id = p_sale_id) then
    raise exception 'A sale with payment history cannot be permanently deleted.';
  end if;

  delete from public.sales where id = p_sale_id;
end;
$$;

create or replace function public.create_sale(
  p_sale_date date,
  p_buyer_name text,
  p_buyer_type text,
  p_delivery_method text,
  p_expedition_name text,
  p_expedition_rate_per_kg bigint,
  p_items jsonb,
  p_initial_payment_amount bigint default 0
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.create_sale(
    p_sale_date, p_buyer_name, p_buyer_type, p_delivery_method,
    p_expedition_name, p_expedition_rate_per_kg, p_items, p_initial_payment_amount
  );
$$;

create or replace function public.record_sale_payment(
  p_sale_id uuid,
  p_payment_date date,
  p_amount bigint
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.record_sale_payment(p_sale_id, p_payment_date, p_amount);
$$;

create or replace function public.correct_sale(
  p_sale_id uuid,
  p_buyer_name text,
  p_buyer_type text,
  p_delivery_method text,
  p_expedition_name text,
  p_expedition_rate_per_kg bigint,
  p_items jsonb,
  p_reason text
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.correct_sale(
    p_sale_id, p_buyer_name, p_buyer_type, p_delivery_method,
    p_expedition_name, p_expedition_rate_per_kg, p_items, p_reason
  );
$$;

create or replace function public.cancel_sale(p_sale_id uuid, p_reason text)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.cancel_sale(p_sale_id, p_reason);
$$;

create or replace function public.delete_sale_without_payments(p_sale_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.delete_sale_without_payments(p_sale_id);
$$;

create view public.available_sale_direct_stock
with (security_invoker = true)
as
select
  ti.id as purchase_item_id,
  t.id as purchase_transaction_id,
  t.seller_type,
  t.farmer_id,
  t.seller_name_snapshot,
  ti.commodity,
  ti.grade,
  ti.gross_weight_kg,
  coalesce(active_allocations.allocated_gross_weight_kg, 0)::integer as allocated_gross_weight_kg,
  (ti.gross_weight_kg - coalesce(active_allocations.allocated_gross_weight_kg, 0)::integer) as available_gross_weight_kg
from public.transaction_items ti
join public.transactions t on t.id = ti.transaction_id
left join lateral (
  select coalesce(sum(a.allocated_gross_weight_kg), 0) as allocated_gross_weight_kg
  from public.sale_stock_allocations a
  join public.sale_items si on si.id = a.sale_item_id
  join public.sales s on s.id = si.sale_id
  where a.purchase_item_id = ti.id
    and a.purchase_container_weight_id is null
    and a.released_at is null
    and s.status = 'active'
) active_allocations on true
where ti.weighing_method = 'direct_total'
  and ti.gross_weight_kg > coalesce(active_allocations.allocated_gross_weight_kg, 0)::integer;

create view public.available_sale_container_stock
with (security_invoker = true)
as
select
  tcw.id as purchase_container_weight_id,
  ti.id as purchase_item_id,
  t.id as purchase_transaction_id,
  t.seller_type,
  t.farmer_id,
  t.seller_name_snapshot,
  ti.commodity,
  ti.grade,
  ti.weighing_method,
  tcw.container_type,
  tcw.sequence_number,
  tcw.weight_kg
from public.transaction_container_weights tcw
join public.transaction_items ti on ti.id = tcw.transaction_item_id
join public.transactions t on t.id = ti.transaction_id
where not exists (
  select 1
  from public.sale_stock_allocations a
  join public.sale_items si on si.id = a.sale_item_id
  join public.sales s on s.id = si.sale_id
  where a.purchase_container_weight_id = tcw.id
    and a.released_at is null
    and s.status = 'active'
);

create view public.sale_payment_states
with (security_invoker = true)
as
select
  s.id as sale_id,
  coalesce(payment_totals.total_paid_amount, 0)::bigint as total_paid_amount,
  (s.total_amount - coalesce(payment_totals.total_paid_amount, 0)::bigint) as remaining_balance_amount,
  case
    when s.status = 'cancelled' then 'cancelled'
    when coalesce(payment_totals.total_paid_amount, 0)::bigint = s.total_amount then 'paid'
    else 'unpaid'
  end as effective_payment_status
from public.sales s
left join lateral (
  select coalesce(sum(amount), 0) as total_paid_amount
  from public.sale_payments p
  where p.sale_id = s.id
) payment_totals on true;

alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.sale_stock_allocations enable row level security;
alter table public.sale_payments enable row level security;
alter table public.sale_change_events enable row level security;
alter table public.sale_number_counters enable row level security;

revoke all on table public.sales from anon, authenticated;
revoke all on table public.sale_items from anon, authenticated;
revoke all on table public.sale_stock_allocations from anon, authenticated;
revoke all on table public.sale_payments from anon, authenticated;
revoke all on table public.sale_change_events from anon, authenticated;
revoke all on table public.sale_number_counters from anon, authenticated;
revoke all on table public.available_sale_direct_stock from anon, authenticated;
revoke all on table public.available_sale_container_stock from anon, authenticated;
revoke all on table public.sale_payment_states from anon, authenticated;

grant select on table public.sales to authenticated;
grant select on table public.sale_items to authenticated;
grant select on table public.sale_stock_allocations to authenticated;
grant select on table public.sale_payments to authenticated;
grant select on table public.sale_change_events to authenticated;
grant select on table public.available_sale_direct_stock to authenticated;
grant select on table public.available_sale_container_stock to authenticated;
grant select on table public.sale_payment_states to authenticated;

create policy "admins_select_sales"
on public.sales for select to authenticated
using ((select private.is_current_admin()));
create policy "admins_select_sale_items"
on public.sale_items for select to authenticated
using ((select private.is_current_admin()));
create policy "admins_select_sale_stock_allocations"
on public.sale_stock_allocations for select to authenticated
using ((select private.is_current_admin()));
create policy "admins_select_sale_payments"
on public.sale_payments for select to authenticated
using ((select private.is_current_admin()));
create policy "admins_select_sale_change_events"
on public.sale_change_events for select to authenticated
using ((select private.is_current_admin()));

grant usage on schema private to authenticated;
grant execute on function private.create_sale(date, text, text, text, text, bigint, jsonb, bigint) to authenticated;
grant execute on function private.record_sale_payment(uuid, date, bigint) to authenticated;
grant execute on function private.correct_sale(uuid, text, text, text, text, bigint, jsonb, text) to authenticated;
grant execute on function private.cancel_sale(uuid, text) to authenticated;
grant execute on function private.delete_sale_without_payments(uuid) to authenticated;

revoke all on function public.create_sale(date, text, text, text, text, bigint, jsonb, bigint) from public;
revoke all on function public.record_sale_payment(uuid, date, bigint) from public;
revoke all on function public.correct_sale(uuid, text, text, text, text, bigint, jsonb, text) from public;
revoke all on function public.cancel_sale(uuid, text) from public;
revoke all on function public.delete_sale_without_payments(uuid) from public;
grant execute on function public.create_sale(date, text, text, text, text, bigint, jsonb, bigint) to authenticated;
grant execute on function public.record_sale_payment(uuid, date, bigint) to authenticated;
grant execute on function public.correct_sale(uuid, text, text, text, text, bigint, jsonb, text) to authenticated;
grant execute on function public.cancel_sale(uuid, text) to authenticated;
grant execute on function public.delete_sale_without_payments(uuid) to authenticated;

revoke all on function private.require_current_admin() from public;
revoke all on function private.refresh_sale_totals(uuid) from public;
revoke all on function private.validate_sale_header(text, text, text, text, bigint) from public;
revoke all on function private.apply_sale_items(uuid, jsonb, boolean) from public;
