-- The Phase 4A private function returns a TABLE column named
-- totalan_number. Qualify the persisted column in INSERT ... RETURNING so
-- PL/pgSQL never confuses that output variable with the table column.
create or replace function private.finalize_totalan(
  p_farmer_id uuid,
  p_transaction_ids uuid[],
  p_totalan_date date,
  p_kasbon_deduction_amount bigint default 0
)
returns table (totalan_id uuid, totalan_number text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_input_count integer;
  v_distinct_input_count integer;
  v_locked_transaction_count integer := 0;
  v_transaction record;
  v_total_net_weight bigint := 0;
  v_gross_harvest_amount bigint := 0;
  v_kasbon_balance bigint := 0;
  v_totalan_id uuid;
  v_totalan_number text;
begin
  perform private.require_current_admin();

  if p_farmer_id is null
    or p_totalan_date is null
    or p_transaction_ids is null
    or cardinality(p_transaction_ids) is null
    or cardinality(p_transaction_ids) = 0
    or array_position(p_transaction_ids, null) is not null then
    raise exception using errcode = 'P0001', message = 'INVALID_TOTALAN_PAYLOAD';
  end if;

  if p_kasbon_deduction_amount is null or p_kasbon_deduction_amount < 0 then
    raise exception using errcode = 'P0001', message = 'INVALID_KASBON_DEDUCTION';
  end if;

  select count(*), count(distinct transaction_id)
    into v_input_count, v_distinct_input_count
  from unnest(p_transaction_ids) as selected(transaction_id);

  if v_input_count <> v_distinct_input_count then
    raise exception using errcode = 'P0001', message = 'INVALID_TOTALAN_PAYLOAD';
  end if;

  perform 1
  from public.farmers f
  where f.id = p_farmer_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'INVALID_FARMER';
  end if;

  for v_transaction in
    select
      t.id,
      t.farmer_id,
      t.seller_type,
      t.payment_status,
      t.total_amount,
      t.total_net_weight_kg
    from public.transactions t
    where t.id = any(p_transaction_ids)
    order by t.id
    for update
  loop
    v_locked_transaction_count := v_locked_transaction_count + 1;

    if v_transaction.seller_type <> 'partner_farmer' then
      raise exception using errcode = 'P0001', message = 'PURCHASE_NOT_ELIGIBLE';
    end if;

    if v_transaction.farmer_id is distinct from p_farmer_id then
      raise exception using errcode = 'P0001', message = 'TOTALAN_FARMER_MISMATCH';
    end if;

    if v_transaction.payment_status <> 'unpaid' then
      raise exception using errcode = 'P0001', message = 'PURCHASE_NOT_ELIGIBLE';
    end if;

    if exists (
      select 1
      from public.totalan_transactions tt
      where tt.transaction_id = v_transaction.id
    ) then
      raise exception using errcode = 'P0001', message = 'PURCHASE_ALREADY_IN_TOTALAN';
    end if;

    v_total_net_weight := v_total_net_weight + v_transaction.total_net_weight_kg;
    v_gross_harvest_amount := v_gross_harvest_amount + v_transaction.total_amount;
  end loop;

  if v_locked_transaction_count <> v_input_count then
    raise exception using errcode = 'P0001', message = 'PURCHASE_NOT_ELIGIBLE';
  end if;

  if v_total_net_weight > 2147483647 then
    raise exception using errcode = 'P0001', message = 'INVALID_TOTALAN_PAYLOAD';
  end if;

  if p_kasbon_deduction_amount > v_gross_harvest_amount then
    raise exception using errcode = 'P0001', message = 'INVALID_KASBON_DEDUCTION';
  end if;

  select coalesce(sum(
    case
      when kle.entry_type = 'advance' then kle.amount
      when kle.entry_type = 'totalan_deduction' then -kle.amount
      else 0
    end
  ), 0)
  into v_kasbon_balance
  from public.kasbon_ledger_entries kle
  where kle.farmer_id = p_farmer_id;

  if p_kasbon_deduction_amount > v_kasbon_balance then
    raise exception using errcode = 'P0001', message = 'KASBON_INSUFFICIENT_BALANCE';
  end if;

  insert into public.totalans as totalan (
    farmer_id,
    totalan_date,
    total_net_weight_kg,
    gross_harvest_amount,
    kasbon_deduction_amount,
    final_payment_amount,
    status
  ) values (
    p_farmer_id,
    p_totalan_date,
    v_total_net_weight::integer,
    v_gross_harvest_amount,
    p_kasbon_deduction_amount,
    v_gross_harvest_amount - p_kasbon_deduction_amount,
    'finalized'
  )
  returning totalan.id, totalan.totalan_number into v_totalan_id, v_totalan_number;

  insert into public.totalan_transactions (totalan_id, transaction_id)
  select v_totalan_id, selected.transaction_id
  from unnest(p_transaction_ids) as selected(transaction_id);

  if p_kasbon_deduction_amount > 0 then
    insert into public.kasbon_ledger_entries (
      farmer_id,
      entry_date,
      entry_type,
      amount,
      notes,
      related_totalan_id
    ) values (
      p_farmer_id,
      p_totalan_date,
      'totalan_deduction',
      p_kasbon_deduction_amount,
      '',
      v_totalan_id
    );
  end if;

  return query select v_totalan_id, v_totalan_number;
end;
$$;
