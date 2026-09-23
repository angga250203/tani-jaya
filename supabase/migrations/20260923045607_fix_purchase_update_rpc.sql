-- Correct the first Purchase RPC definition without modifying its applied
-- migration. Qualifying header columns avoids collision with TABLE return names.
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

  select t.transaction_number, t.seller_type, t.farmer_id, t.seller_name_snapshot
    into v_existing_number, v_old_seller_type, v_old_farmer_id, v_old_seller_name_snapshot
  from public.transactions t
  where t.id = p_transaction_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'PURCHASE_NOT_FOUND';
  end if;

  if exists (
    select 1
    from public.totalan_transactions tt
    where tt.transaction_id = p_transaction_id
  ) then
    raise exception using errcode = 'P0001', message = 'PURCHASE_FINALIZED_TOTALAN';
  end if;

  for v_existing_item in
    select ti.id
    from public.transaction_items ti
    where ti.transaction_id = p_transaction_id
    order by ti.id
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
    if v_old_seller_type = 'partner_farmer' and v_old_farmer_id = v_farmer_id then
      v_seller_name_snapshot := v_old_seller_name_snapshot;
    else
      select f.name into v_seller_name_snapshot from public.farmers f where f.id = v_farmer_id;
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

    select ti.id, ti.commodity, ti.grade, ti.weighing_method, ti.gross_weight_kg
      into v_existing_item
    from public.transaction_items ti
    where ti.id = v_item_id
      and ti.transaction_id = p_transaction_id;
    if not found then
      raise exception using errcode = 'P0001', message = 'INVALID_PURCHASE_PAYLOAD';
    end if;

    select exists (
      select 1 from public.sale_stock_allocations a where a.purchase_item_id = v_item_id
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

        select tcw.id, tcw.container_type, tcw.sequence_number, tcw.weight_kg
          into v_existing_container
        from public.transaction_container_weights tcw
        where tcw.id = v_item_id
          and tcw.transaction_item_id = v_existing_item.id;
        if not found
          or v_existing_container.container_type <> (case v_weighing_method when 'per_sack' then 'sack' when 'per_crate' then 'crate' end)
          or v_existing_container.sequence_number <> private.purchase_payload_integer(v_container -> 'sequence_number')
          or v_existing_container.weight_kg <> private.purchase_payload_integer(v_container -> 'weight_kg') then
          raise exception using errcode = 'P0001', message = 'PURCHASE_ITEM_USED_BY_SALE';
        end if;
      end loop;

      select count(*) into v_expected_container_count
      from public.transaction_container_weights tcw
      where tcw.transaction_item_id = v_existing_item.id;
      if coalesce(array_length(v_seen_container_ids, 1), 0) <> v_expected_container_count then
        raise exception using errcode = 'P0001', message = 'PURCHASE_ITEM_USED_BY_SALE';
      end if;

      update public.transaction_items ti
      set deduction_weight_kg = v_deduction_weight,
          price_per_kg = v_price_per_kg
      where ti.id = v_existing_item.id;
    else
      delete from public.transaction_container_weights tcw
      where tcw.transaction_item_id = v_existing_item.id;

      update public.transaction_items ti
      set commodity = v_commodity,
          grade = v_grade,
          weighing_method = v_weighing_method,
          gross_weight_kg = v_gross_weight,
          deduction_weight_kg = v_deduction_weight,
          price_per_kg = v_price_per_kg
      where ti.id = v_existing_item.id;

      perform private.insert_purchase_containers(
        v_existing_item.id, v_weighing_method, v_item -> 'containers'
      );
    end if;
  end loop;

  for v_existing_item in
    select ti.id
    from public.transaction_items ti
    where ti.transaction_id = p_transaction_id
    order by ti.id
    for update
  loop
    if not (v_existing_item.id = any(v_seen_item_ids)) then
      if exists (
        select 1 from public.sale_stock_allocations a where a.purchase_item_id = v_existing_item.id
      ) then
        raise exception using errcode = 'P0001', message = 'PURCHASE_ITEM_USED_BY_SALE';
      end if;
      delete from public.transaction_container_weights tcw where tcw.transaction_item_id = v_existing_item.id;
      delete from public.transaction_items ti where ti.id = v_existing_item.id;
    end if;
  end loop;

  update public.transactions t
  set transaction_date = private.purchase_payload_date(p_payload -> 'transaction_date'),
      transaction_time = private.purchase_payload_time(p_payload -> 'transaction_time'),
      seller_type = v_seller_type,
      farmer_id = v_farmer_id,
      seller_name_snapshot = v_seller_name_snapshot,
      schedule_id = v_schedule_id,
      cycle_id = v_cycle_id,
      payment_status = private.purchase_payload_text(p_payload -> 'payment_status', true),
      notes = coalesce(private.purchase_payload_text(p_payload -> 'notes'), '')
  where t.id = p_transaction_id;

  perform private.verify_purchase_totals(p_transaction_id);
  return query select p_transaction_id, v_existing_number;
end;
$$;
