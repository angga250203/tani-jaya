-- Phase 4A: controlled Totalan and Kasbon mutations.
--
-- Totalans are finalized directly in this phase. There is deliberately no
-- database draft lifecycle: a future UI may assemble a local draft, then send
-- the selected Purchase UUIDs to the one atomic finalization operation below.

-- A Totalan needs its business/operational date independently from the audit
-- timestamp. The linked project has no Totalan rows at this point, so this can
-- remain required without inventing a UTC-derived date for historical rows.
alter table public.totalans
  add column totalan_date date not null;

-- The existing schema requires a unique human-facing reference but does not
-- define an approved allocation format. Keep the unique constraint, while
-- allowing the controlled operation to use the UUID as its identity until the
-- product defines a Totalan number convention.
alter table public.totalans
  alter column totalan_number drop not null;

create index totalans_farmer_totalan_date_idx
  on public.totalans (farmer_id, totalan_date desc, finalized_at desc);

create or replace function private.create_kasbon_advance(
  p_farmer_id uuid,
  p_entry_date date,
  p_amount bigint,
  p_notes text default ''
)
returns table (ledger_entry_id uuid, farmer_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ledger_entry_id uuid;
begin
  perform private.require_current_admin();

  if p_entry_date is null or p_amount is null or p_amount <= 0 then
    raise exception using errcode = 'P0001', message = 'INVALID_KASBON_AMOUNT';
  end if;

  -- This serializes all approved Kasbon mutations for one farmer. It is also
  -- the same lock acquired by finalize_totalan before it derives the balance.
  perform 1
  from public.farmers f
  where f.id = p_farmer_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'INVALID_FARMER';
  end if;

  insert into public.kasbon_ledger_entries (
    farmer_id,
    entry_date,
    entry_type,
    amount,
    notes,
    related_totalan_id
  ) values (
    p_farmer_id,
    p_entry_date,
    'advance',
    p_amount,
    btrim(coalesce(p_notes, '')),
    null
  )
  returning id into v_ledger_entry_id;

  return query select v_ledger_entry_id, p_farmer_id;
end;
$$;

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

  -- One farmer lock serializes Kasbon advance/deduction mutations and two
  -- finalization attempts for that farmer. Keep it short: no network work or
  -- client-dependent calculations occur after this point.
  perform 1
  from public.farmers f
  where f.id = p_farmer_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'INVALID_FARMER';
  end if;

  -- Lock all selected Purchases in stable UUID order before their eligibility
  -- or existing membership is inspected. This is compatible with the existing
  -- update_purchase lock strategy and prevents a concurrent finalization from
  -- claiming the same Purchase.
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

  insert into public.totalans (
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
  returning id, totalan_number into v_totalan_id, v_totalan_number;

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

create or replace function public.create_kasbon_advance(
  p_farmer_id uuid,
  p_entry_date date,
  p_amount bigint,
  p_notes text default ''
)
returns table (ledger_entry_id uuid, farmer_id uuid)
language sql
security invoker
set search_path = ''
as $$
  select *
  from private.create_kasbon_advance(
    p_farmer_id,
    p_entry_date,
    p_amount,
    p_notes
  );
$$;

create or replace function public.finalize_totalan(
  p_farmer_id uuid,
  p_transaction_ids uuid[],
  p_totalan_date date,
  p_kasbon_deduction_amount bigint default 0
)
returns table (totalan_id uuid, totalan_number text)
language sql
security invoker
set search_path = ''
as $$
  select *
  from private.finalize_totalan(
    p_farmer_id,
    p_transaction_ids,
    p_totalan_date,
    p_kasbon_deduction_amount
  );
$$;

-- Financial histories remain readable to an allowlisted Admin, but no browser
-- client can directly insert finalized Totalans, memberships, or ledger rows.
-- These operations must pass through the controlled RPCs above.
revoke insert on table public.totalans from authenticated;
revoke insert on table public.totalan_transactions from authenticated;
revoke insert on table public.kasbon_ledger_entries from authenticated;

grant usage on schema private to authenticated;
grant execute on function private.create_kasbon_advance(uuid, date, bigint, text) to authenticated;
grant execute on function private.finalize_totalan(uuid, uuid[], date, bigint) to authenticated;

revoke all on function public.create_kasbon_advance(uuid, date, bigint, text) from public, anon, service_role;
revoke all on function public.finalize_totalan(uuid, uuid[], date, bigint) from public, anon, service_role;
grant execute on function public.create_kasbon_advance(uuid, date, bigint, text) to authenticated;
grant execute on function public.finalize_totalan(uuid, uuid[], date, bigint) to authenticated;

revoke all on function private.create_kasbon_advance(uuid, date, bigint, text) from public, anon, service_role;
revoke all on function private.finalize_totalan(uuid, uuid[], date, bigint) from public, anon, service_role;
