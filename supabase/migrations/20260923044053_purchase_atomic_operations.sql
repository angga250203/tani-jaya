-- Atomic Purchase operations. Purchase headers, items, and container weights
-- must never be assembled through independent browser writes.

create table public.purchase_number_counters (
  operational_date date primary key,
  last_sequence integer not null default 0 check (last_sequence >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger purchase_number_counters_set_updated_at
before update on public.purchase_number_counters
for each row execute function public.set_updated_at();

-- JSON helpers intentionally accept only JSON numbers for money and weight.
-- This avoids locale/formatted values and decimal weights crossing the database
-- boundary unnoticed.
create or replace function private.purchase_payload_text(
  p_value jsonb,
  p_required boolean default false
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_value text;
begin
  if p_value is null or jsonb_typeof(p_value) = 'null' then
    if p_required then
      raise exception using errcode = 'P0001', message = 'INVALID_PURCHASE_PAYLOAD';
    end if;
    return null;
  end if;

  if jsonb_typeof(p_value) <> 'string' then
    raise exception using errcode = 'P0001', message = 'INVALID_PURCHASE_PAYLOAD';
  end if;

  v_value := btrim(p_value #>> '{}');
  if p_required and length(v_value) = 0 then
    raise exception using errcode = 'P0001', message = 'INVALID_PURCHASE_PAYLOAD';
  end if;

  return v_value;
end;
$$;

create or replace function private.purchase_payload_integer(p_value jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_text text;
begin
  if p_value is null
    or jsonb_typeof(p_value) <> 'number'
    or (p_value #>> '{}') !~ '^-?[0-9]+$' then
    raise exception using errcode = 'P0001', message = 'INVALID_PURCHASE_PAYLOAD';
  end if;

  v_text := p_value #>> '{}';
  begin
    return v_text::integer;
  exception when others then
    raise exception using errcode = 'P0001', message = 'INVALID_PURCHASE_PAYLOAD';
  end;
end;
$$;

create or replace function private.purchase_payload_bigint(p_value jsonb)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_text text;
begin
  if p_value is null
    or jsonb_typeof(p_value) <> 'number'
    or (p_value #>> '{}') !~ '^-?[0-9]+$' then
    raise exception using errcode = 'P0001', message = 'INVALID_PURCHASE_PAYLOAD';
  end if;

  v_text := p_value #>> '{}';
  begin
    return v_text::bigint;
  exception when others then
    raise exception using errcode = 'P0001', message = 'INVALID_PURCHASE_PAYLOAD';
  end;
end;
$$;

create or replace function private.purchase_payload_uuid(p_value jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_text text;
begin
  if p_value is null or jsonb_typeof(p_value) = 'null' then
    return null;
  end if;

  if jsonb_typeof(p_value) <> 'string' then
    raise exception using errcode = 'P0001', message = 'INVALID_PURCHASE_PAYLOAD';
  end if;

  v_text := p_value #>> '{}';
  if v_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception using errcode = 'P0001', message = 'INVALID_PURCHASE_PAYLOAD';
  end if;

  return v_text::uuid;
end;
$$;

create or replace function private.purchase_payload_date(p_value jsonb)
returns date
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_text text;
begin
  v_text := private.purchase_payload_text(p_value, true);
  if v_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception using errcode = 'P0001', message = 'INVALID_PURCHASE_PAYLOAD';
  end if;

  begin
    return v_text::date;
  exception when others then
    raise exception using errcode = 'P0001', message = 'INVALID_PURCHASE_PAYLOAD';
  end;
end;
$$;

create or replace function private.purchase_payload_time(p_value jsonb)
returns time
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_text text;
begin
  if p_value is null or jsonb_typeof(p_value) = 'null' then
    return null;
  end if;

  v_text := private.purchase_payload_text(p_value, true);
  if v_text !~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9]([.][0-9]{1,6})?)?$' then
    raise exception using errcode = 'P0001', message = 'INVALID_PURCHASE_PAYLOAD';
  end if;

  begin
    return v_text::time;
  exception when others then
    raise exception using errcode = 'P0001', message = 'INVALID_PURCHASE_PAYLOAD';
  end;
end;
$$;

create or replace function private.validate_purchase_header(p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_seller_type text;
  v_payment_status text;
  v_farmer_id uuid;
  v_cycle_id uuid;
  v_schedule_id uuid;
  v_schedule_cycle_id uuid;
begin
  if jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = 'P0001', message = 'INVALID_PURCHASE_PAYLOAD';
  end if;

  perform private.purchase_payload_date(p_payload -> 'transaction_date');
  perform private.purchase_payload_time(p_payload -> 'transaction_time');
  v_seller_type := private.purchase_payload_text(p_payload -> 'seller_type', true);
  v_payment_status := private.purchase_payload_text(p_payload -> 'payment_status', true);
  v_farmer_id := private.purchase_payload_uuid(p_payload -> 'farmer_id');
  v_cycle_id := private.purchase_payload_uuid(p_payload -> 'cycle_id');
  v_schedule_id := private.purchase_payload_uuid(p_payload -> 'schedule_id');

  if v_seller_type not in ('partner_farmer', 'general_seller')
    or v_payment_status not in ('paid', 'unpaid') then
    raise exception using errcode = 'P0001', message = 'INVALID_PURCHASE_PAYLOAD';
  end if;

  if v_seller_type = 'general_seller' then
    if v_farmer_id is not null
      or v_cycle_id is not null
      or v_schedule_id is not null
      or v_payment_status <> 'paid' then
      raise exception using errcode = 'P0001', message = 'INVALID_SELLER';
    end if;
    perform private.purchase_payload_text(p_payload -> 'seller_name_snapshot', true);
    return;
  end if;

  if v_farmer_id is null then
    raise exception using errcode = 'P0001', message = 'INVALID_SELLER';
  end if;

  perform 1
  from public.farmers
  where id = v_farmer_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'INVALID_SELLER';
  end if;

  if v_schedule_id is not null and v_cycle_id is null then
    raise exception using errcode = 'P0001', message = 'INVALID_PURCHASE_PAYLOAD';
  end if;

  if v_cycle_id is not null then
    perform 1
    from public.harvest_cycles hc
    join public.fields f on f.id = hc.field_id
    where hc.id = v_cycle_id
      and f.farmer_id = v_farmer_id;
    if not found then
      raise exception using errcode = 'P0001', message = 'INVALID_SELLER';
    end if;
  end if;

  if v_schedule_id is not null then
    select cycle_id
      into v_schedule_cycle_id
    from public.harvest_schedules
    where id = v_schedule_id;
    if not found or v_schedule_cycle_id <> v_cycle_id then
      raise exception using errcode = 'P0001', message = 'INVALID_PURCHASE_PAYLOAD';
    end if;
  end if;
end;
$$;

create or replace function private.validate_purchase_item_payload(p_item jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_commodity text;
  v_grade text;
  v_weighing_method text;
  v_gross_weight integer;
  v_deduction_weight integer;
  v_price_per_kg bigint;
  v_containers jsonb;
  v_container jsonb;
  v_container_weight integer;
  v_sequence_number integer;
  v_container_total bigint := 0;
  v_sequences integer[] := '{}'::integer[];
begin
  if jsonb_typeof(p_item) <> 'object' then
    raise exception using errcode = 'P0001', message = 'INVALID_PURCHASE_PAYLOAD';
  end if;

  -- Optional IDs are only identifiers for an existing row during update.
  perform private.purchase_payload_uuid(p_item -> 'id');
  v_commodity := private.purchase_payload_text(p_item -> 'commodity', true);
  v_grade := private.purchase_payload_text(p_item -> 'grade', true);
  v_weighing_method := private.purchase_payload_text(p_item -> 'weighing_method', true);
  v_gross_weight := private.purchase_payload_integer(p_item -> 'gross_weight_kg');
  v_deduction_weight := private.purchase_payload_integer(p_item -> 'deduction_weight_kg');
  v_price_per_kg := private.purchase_payload_bigint(p_item -> 'price_per_kg');
  v_containers := p_item -> 'containers';

  if length(v_commodity) = 0
    or v_grade not in ('SP', 'TG', 'BR')
    or v_weighing_method not in ('direct_total', 'per_sack', 'per_crate')
    or v_gross_weight < 0
    or v_deduction_weight < 0
    or v_deduction_weight > v_gross_weight
    or v_price_per_kg < 0
    or jsonb_typeof(v_containers) <> 'array' then
    raise exception using errcode = 'P0001', message = 'INVALID_PURCHASE_PAYLOAD';
  end if;

  if v_weighing_method = 'direct_total' then
    if jsonb_array_length(v_containers) <> 0 then
      raise exception using errcode = 'P0001', message = 'INVALID_CONTAINER_TOTAL';
    end if;
    return;
  end if;

  if jsonb_array_length(v_containers) = 0 then
    raise exception using errcode = 'P0001', message = 'INVALID_CONTAINER_TOTAL';
  end if;

  for v_container in select value from jsonb_array_elements(v_containers)
  loop
    if jsonb_typeof(v_container) <> 'object' then
      raise exception using errcode = 'P0001', message = 'INVALID_PURCHASE_PAYLOAD';
    end if;
    perform private.purchase_payload_uuid(v_container -> 'id');
    v_sequence_number := private.purchase_payload_integer(v_container -> 'sequence_number');
    v_container_weight := private.purchase_payload_integer(v_container -> 'weight_kg');
    if v_sequence_number < 1 or v_container_weight <= 0 or v_sequence_number = any(v_sequences) then
      raise exception using errcode = 'P0001', message = 'INVALID_CONTAINER_TOTAL';
    end if;
    v_sequences := array_append(v_sequences, v_sequence_number);
    v_container_total := v_container_total + v_container_weight;
  end loop;

  if v_container_total <> v_gross_weight then
    raise exception using errcode = 'P0001', message = 'INVALID_CONTAINER_TOTAL';
  end if;
end;
$$;

create or replace function private.insert_purchase_containers(
  p_transaction_item_id uuid,
  p_weighing_method text,
  p_containers jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_container jsonb;
  v_container_type text;
begin
  if p_weighing_method = 'direct_total' then
    return;
  end if;

  v_container_type := case p_weighing_method
    when 'per_sack' then 'sack'
    when 'per_crate' then 'crate'
  end;

  for v_container in select value from jsonb_array_elements(p_containers)
  loop
    insert into public.transaction_container_weights (
      transaction_item_id, container_type, sequence_number, weight_kg
    ) values (
      p_transaction_item_id,
      v_container_type,
      private.purchase_payload_integer(v_container -> 'sequence_number'),
      private.purchase_payload_integer(v_container -> 'weight_kg')
    );
  end loop;
end;
$$;

create or replace function private.insert_purchase_item(
  p_transaction_id uuid,
  p_item jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_transaction_item_id uuid;
  v_weighing_method text;
begin
  perform private.validate_purchase_item_payload(p_item);
  if private.purchase_payload_uuid(p_item -> 'id') is not null then
    raise exception using errcode = 'P0001', message = 'INVALID_PURCHASE_PAYLOAD';
  end if;

  v_weighing_method := private.purchase_payload_text(p_item -> 'weighing_method', true);
  insert into public.transaction_items (
    transaction_id, commodity, grade, weighing_method,
    gross_weight_kg, deduction_weight_kg, price_per_kg
  ) values (
    p_transaction_id,
    private.purchase_payload_text(p_item -> 'commodity', true),
    private.purchase_payload_text(p_item -> 'grade', true),
    v_weighing_method,
    private.purchase_payload_integer(p_item -> 'gross_weight_kg'),
    private.purchase_payload_integer(p_item -> 'deduction_weight_kg'),
    private.purchase_payload_bigint(p_item -> 'price_per_kg')
  ) returning id into v_transaction_item_id;

  perform private.insert_purchase_containers(
    v_transaction_item_id, v_weighing_method, p_item -> 'containers'
  );

  return v_transaction_item_id;
end;
$$;

create or replace function private.verify_purchase_totals(p_transaction_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expected_weight integer;
  v_expected_amount bigint;
  v_actual_weight integer;
  v_actual_amount bigint;
begin
  select coalesce(sum(net_weight_kg), 0), coalesce(sum(subtotal), 0)
    into v_expected_weight, v_expected_amount
  from public.transaction_items
  where transaction_id = p_transaction_id;

  select total_net_weight_kg, total_amount
    into v_actual_weight, v_actual_amount
  from public.transactions
  where id = p_transaction_id;

  if not found
    or v_actual_weight <> v_expected_weight
    or v_actual_amount <> v_expected_amount then
    raise exception using errcode = 'P0001', message = 'INVALID_PURCHASE_PAYLOAD';
  end if;
end;
$$;

create or replace function private.create_purchase(p_payload jsonb)
returns table (transaction_id uuid, transaction_number text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_operational_date date;
  v_sequence integer;
  v_transaction_id uuid;
  v_transaction_number text;
  v_seller_type text;
  v_farmer_id uuid;
  v_seller_name_snapshot text;
  v_cycle_id uuid;
  v_schedule_id uuid;
  v_items jsonb;
  v_item jsonb;
begin
  perform private.require_current_admin();
  perform private.validate_purchase_header(p_payload);

  v_items := p_payload -> 'items';
  if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 then
    raise exception using errcode = 'P0001', message = 'INVALID_PURCHASE_PAYLOAD';
  end if;

  v_seller_type := private.purchase_payload_text(p_payload -> 'seller_type', true);
  v_farmer_id := private.purchase_payload_uuid(p_payload -> 'farmer_id');
  v_cycle_id := private.purchase_payload_uuid(p_payload -> 'cycle_id');
  v_schedule_id := private.purchase_payload_uuid(p_payload -> 'schedule_id');
  if v_seller_type = 'partner_farmer' then
    select name into v_seller_name_snapshot
    from public.farmers
    where id = v_farmer_id;
  else
    v_seller_name_snapshot := private.purchase_payload_text(p_payload -> 'seller_name_snapshot', true);
  end if;

  -- The number represents the Jakarta operational date, not an editable
  -- business date supplied in the Purchase payload.
  v_operational_date := timezone('Asia/Jakarta', now())::date;
  insert into public.purchase_number_counters (operational_date, last_sequence)
  values (v_operational_date, 1)
  on conflict (operational_date) do update
    set last_sequence = public.purchase_number_counters.last_sequence + 1
  returning last_sequence into v_sequence;

  if v_sequence > 9999 then
    raise exception using errcode = 'P0001', message = 'PURCHASE_NUMBER_EXHAUSTED';
  end if;

  v_transaction_number := 'PB-' || to_char(v_operational_date, 'YYYYMMDD') || '-' || lpad(v_sequence::text, 4, '0');
  insert into public.transactions (
    transaction_number, transaction_date, transaction_time, seller_type,
    farmer_id, seller_name_snapshot, schedule_id, cycle_id, payment_status, notes
  ) values (
    v_transaction_number,
    private.purchase_payload_date(p_payload -> 'transaction_date'),
    private.purchase_payload_time(p_payload -> 'transaction_time'),
    v_seller_type,
    v_farmer_id,
    v_seller_name_snapshot,
    v_schedule_id,
    v_cycle_id,
    private.purchase_payload_text(p_payload -> 'payment_status', true),
    coalesce(private.purchase_payload_text(p_payload -> 'notes'), '')
  ) returning id into v_transaction_id;

  for v_item in select value from jsonb_array_elements(v_items)
  loop
    perform private.insert_purchase_item(v_transaction_id, v_item);
  end loop;

  perform private.verify_purchase_totals(v_transaction_id);
  return query select v_transaction_id, v_transaction_number;
end;
$$;

create or replace function private.update_purchase(
  p_transaction_id uuid,
  p_payload jsonb
)
returns table (transaction_id uuid, transaction_number text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing_number text;
  v_old_seller_type text;
  v_old_farmer_id uuid;
  v_old_seller_name_snapshot text;
  v_seller_type text;
  v_farmer_id uuid;
  v_seller_name_snapshot text;
  v_cycle_id uuid;
  v_schedule_id uuid;
  v_items jsonb;
  v_item jsonb;
  v_container jsonb;
  v_item_id uuid;
  v_existing_item record;
  v_existing_container record;
  v_commodity text;
  v_grade text;
  v_weighing_method text;
  v_gross_weight integer;
  v_deduction_weight integer;
  v_price_per_kg bigint;
  v_seen_item_ids uuid[] := '{}'::uuid[];
  v_seen_container_ids uuid[];
  v_has_sale_history boolean := false;
  v_any_sale_history boolean := false;
  v_expected_container_count integer;
begin
  perform private.require_current_admin();
  if p_transaction_id is null then
    raise exception using errcode = 'P0001', message = 'INVALID_PURCHASE_PAYLOAD';
  end if;
  perform private.validate_purchase_header(p_payload);

  select transaction_number, seller_type, farmer_id, seller_name_snapshot
    into v_existing_number, v_old_seller_type, v_old_farmer_id, v_old_seller_name_snapshot
  from public.transactions
  where id = p_transaction_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'PURCHASE_NOT_FOUND';
  end if;

  -- The transaction row lock also prevents a concurrent totalan FK insert from
  -- passing while this edit is being assessed.
  if exists (
    select 1
    from public.totalan_transactions
    where transaction_id = p_transaction_id
  ) then
    raise exception using errcode = 'P0001', message = 'PURCHASE_FINALIZED_TOTALAN';
  end if;

  -- Sales operations lock Purchase items then containers. Acquire the same
  -- objects in stable UUID order before checking or replacing their state.
  for v_existing_item in
    select id
    from public.transaction_items
    where transaction_id = p_transaction_id
    order by id
    for update
  loop
    null;
  end loop;

  for v_existing_container in
    select tcw.id
    from public.transaction_container_weights tcw
    join public.transaction_items ti on ti.id = tcw.transaction_item_id
    where ti.transaction_id = p_transaction_id
    order by tcw.id
    for update
  loop
    null;
  end loop;

  v_items := p_payload -> 'items';
  if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 then
    raise exception using errcode = 'P0001', message = 'INVALID_PURCHASE_PAYLOAD';
  end if;

  v_seller_type := private.purchase_payload_text(p_payload -> 'seller_type', true);
  v_farmer_id := private.purchase_payload_uuid(p_payload -> 'farmer_id');
  v_cycle_id := private.purchase_payload_uuid(p_payload -> 'cycle_id');
  v_schedule_id := private.purchase_payload_uuid(p_payload -> 'schedule_id');
  if v_seller_type = 'partner_farmer' then
    -- A farmer rename must not rewrite this Purchase's historical seller
    -- snapshot when its source identity itself has not changed.
    if v_old_seller_type = 'partner_farmer' and v_old_farmer_id = v_farmer_id then
      v_seller_name_snapshot := v_old_seller_name_snapshot;
    else
      select name into v_seller_name_snapshot from public.farmers where id = v_farmer_id;
    end if;
  else
    v_seller_name_snapshot := private.purchase_payload_text(p_payload -> 'seller_name_snapshot', true);
  end if;

  select exists (
    select 1
    from public.transaction_items ti
    join public.sale_stock_allocations a on a.purchase_item_id = ti.id
    where ti.transaction_id = p_transaction_id
  ) into v_any_sale_history;

  if v_any_sale_history
    and (v_seller_type is distinct from v_old_seller_type
      or v_farmer_id is distinct from v_old_farmer_id
      or v_seller_name_snapshot is distinct from v_old_seller_name_snapshot) then
    raise exception using errcode = 'P0001', message = 'PURCHASE_ITEM_USED_BY_SALE';
  end if;

  for v_item in select value from jsonb_array_elements(v_items)
  loop
    perform private.validate_purchase_item_payload(v_item);
    v_item_id := private.purchase_payload_uuid(v_item -> 'id');

    if v_item_id is null then
      v_item_id := private.insert_purchase_item(p_transaction_id, v_item);
      v_seen_item_ids := array_append(v_seen_item_ids, v_item_id);
      continue;
    end if;

    if v_item_id = any(v_seen_item_ids) then
      raise exception using errcode = 'P0001', message = 'INVALID_PURCHASE_PAYLOAD';
    end if;
    v_seen_item_ids := array_append(v_seen_item_ids, v_item_id);

    select id, commodity, grade, weighing_method, gross_weight_kg
      into v_existing_item
    from public.transaction_items
    where id = v_item_id
      and transaction_id = p_transaction_id;
    if not found then
      raise exception using errcode = 'P0001', message = 'INVALID_PURCHASE_PAYLOAD';
    end if;

    select exists (
      select 1 from public.sale_stock_allocations where purchase_item_id = v_item_id
    ) into v_has_sale_history;

    v_commodity := private.purchase_payload_text(v_item -> 'commodity', true);
    v_grade := private.purchase_payload_text(v_item -> 'grade', true);
    v_weighing_method := private.purchase_payload_text(v_item -> 'weighing_method', true);
    v_gross_weight := private.purchase_payload_integer(v_item -> 'gross_weight_kg');
    v_deduction_weight := private.purchase_payload_integer(v_item -> 'deduction_weight_kg');
    v_price_per_kg := private.purchase_payload_bigint(v_item -> 'price_per_kg');

    if v_has_sale_history then
      if v_commodity is distinct from v_existing_item.commodity
        or v_grade is distinct from v_existing_item.grade
        or v_weighing_method is distinct from v_existing_item.weighing_method
        or v_gross_weight is distinct from v_existing_item.gross_weight_kg then
        raise exception using errcode = 'P0001', message = 'PURCHASE_ITEM_USED_BY_SALE';
      end if;

      v_seen_container_ids := '{}'::uuid[];
      for v_container in select value from jsonb_array_elements(v_item -> 'containers')
      loop
        v_item_id := private.purchase_payload_uuid(v_container -> 'id');
        if v_item_id is null or v_item_id = any(v_seen_container_ids) then
          raise exception using errcode = 'P0001', message = 'PURCHASE_ITEM_USED_BY_SALE';
        end if;
        v_seen_container_ids := array_append(v_seen_container_ids, v_item_id);

        select id, container_type, sequence_number, weight_kg
          into v_existing_container
        from public.transaction_container_weights
        where id = v_item_id
          and transaction_item_id = v_existing_item.id;
        if not found
          or v_existing_container.container_type <> (case v_weighing_method when 'per_sack' then 'sack' when 'per_crate' then 'crate' end)
          or v_existing_container.sequence_number <> private.purchase_payload_integer(v_container -> 'sequence_number')
          or v_existing_container.weight_kg <> private.purchase_payload_integer(v_container -> 'weight_kg') then
          raise exception using errcode = 'P0001', message = 'PURCHASE_ITEM_USED_BY_SALE';
        end if;
      end loop;

      select count(*) into v_expected_container_count
      from public.transaction_container_weights
      where transaction_item_id = v_existing_item.id;
      if coalesce(array_length(v_seen_container_ids, 1), 0) <> v_expected_container_count then
        raise exception using errcode = 'P0001', message = 'PURCHASE_ITEM_USED_BY_SALE';
      end if;

      update public.transaction_items
      set deduction_weight_kg = v_deduction_weight,
          price_per_kg = v_price_per_kg
      where id = v_existing_item.id;
    else
      delete from public.transaction_container_weights
      where transaction_item_id = v_existing_item.id;

      update public.transaction_items
      set commodity = v_commodity,
          grade = v_grade,
          weighing_method = v_weighing_method,
          gross_weight_kg = v_gross_weight,
          deduction_weight_kg = v_deduction_weight,
          price_per_kg = v_price_per_kg
      where id = v_existing_item.id;

      perform private.insert_purchase_containers(
        v_existing_item.id, v_weighing_method, v_item -> 'containers'
      );
    end if;
  end loop;

  for v_existing_item in
    select id
    from public.transaction_items
    where transaction_id = p_transaction_id
    order by id
    for update
  loop
    if not (v_existing_item.id = any(v_seen_item_ids)) then
      if exists (
        select 1 from public.sale_stock_allocations where purchase_item_id = v_existing_item.id
      ) then
        raise exception using errcode = 'P0001', message = 'PURCHASE_ITEM_USED_BY_SALE';
      end if;
      delete from public.transaction_container_weights where transaction_item_id = v_existing_item.id;
      delete from public.transaction_items where id = v_existing_item.id;
    end if;
  end loop;

  update public.transactions
  set transaction_date = private.purchase_payload_date(p_payload -> 'transaction_date'),
      transaction_time = private.purchase_payload_time(p_payload -> 'transaction_time'),
      seller_type = v_seller_type,
      farmer_id = v_farmer_id,
      seller_name_snapshot = v_seller_name_snapshot,
      schedule_id = v_schedule_id,
      cycle_id = v_cycle_id,
      payment_status = private.purchase_payload_text(p_payload -> 'payment_status', true),
      notes = coalesce(private.purchase_payload_text(p_payload -> 'notes'), '')
  where id = p_transaction_id;

  perform private.verify_purchase_totals(p_transaction_id);
  return query select p_transaction_id, v_existing_number;
end;
$$;

create or replace function public.create_purchase(p_payload jsonb)
returns table (transaction_id uuid, transaction_number text)
language sql
security invoker
set search_path = ''
as $$
  select * from private.create_purchase(p_payload);
$$;

create or replace function public.update_purchase(
  p_transaction_id uuid,
  p_payload jsonb
)
returns table (transaction_id uuid, transaction_number text)
language sql
security invoker
set search_path = ''
as $$
  select * from private.update_purchase(p_transaction_id, p_payload);
$$;

-- Counters and Purchase mutation tables remain internal to controlled RPCs.
alter table public.purchase_number_counters enable row level security;
revoke all on table public.purchase_number_counters from anon, authenticated;
revoke insert, update, delete on table public.transactions from authenticated;
revoke insert, update, delete on table public.transaction_items from authenticated;
revoke insert, update, delete on table public.transaction_container_weights from authenticated;

grant usage on schema private to authenticated;
grant execute on function private.create_purchase(jsonb) to authenticated;
grant execute on function private.update_purchase(uuid, jsonb) to authenticated;

revoke all on function public.create_purchase(jsonb) from public;
revoke all on function public.update_purchase(uuid, jsonb) from public;
grant execute on function public.create_purchase(jsonb) to authenticated;
grant execute on function public.update_purchase(uuid, jsonb) to authenticated;

revoke all on function private.purchase_payload_text(jsonb, boolean) from public;
revoke all on function private.purchase_payload_integer(jsonb) from public;
revoke all on function private.purchase_payload_bigint(jsonb) from public;
revoke all on function private.purchase_payload_uuid(jsonb) from public;
revoke all on function private.purchase_payload_date(jsonb) from public;
revoke all on function private.purchase_payload_time(jsonb) from public;
revoke all on function private.validate_purchase_header(jsonb) from public;
revoke all on function private.validate_purchase_item_payload(jsonb) from public;
revoke all on function private.insert_purchase_containers(uuid, text, jsonb) from public;
revoke all on function private.insert_purchase_item(uuid, jsonb) from public;
revoke all on function private.verify_purchase_totals(uuid) from public;
