-- Tani Jaya initial domain schema.
-- This migration intentionally creates no mock-data seed and no UI integration.

create extension if not exists pgcrypto;

-- The PRD specifies one Admin account. This allowlist is deliberately small and
-- avoids introducing tenant ownership columns to every operational table.
create table public.app_admins (
  user_id uuid primary key references auth.users (id) on delete restrict,
  created_at timestamptz not null default now()
);

create or replace function public.is_current_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_admins
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_current_admin() from public;
grant execute on function public.is_current_admin() to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.farmers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  whatsapp text not null check (length(btrim(whatsapp)) > 0),
  location_reference text not null check (length(btrim(location_reference)) > 0),
  notes text not null default '',
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fields (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.farmers (id) on delete restrict,
  name text not null check (length(btrim(name)) > 0),
  location_reference text not null check (length(btrim(location_reference)) > 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.harvest_cycles (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.fields (id) on delete restrict,
  commodity text not null check (length(btrim(commodity)) > 0),
  status text not null default 'active' check (status in ('active', 'completed')),
  harvest_interval_days integer not null check (harvest_interval_days >= 1),
  default_receiving_method text not null check (default_receiving_method in ('picked_up', 'delivered')),
  first_harvest_at date,
  last_harvest_at date,
  ended_at date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (last_harvest_at is null or first_harvest_at is not null),
  check (last_harvest_at is null or last_harvest_at >= first_harvest_at),
  check (ended_at is null or first_harvest_at is null or ended_at >= first_harvest_at),
  check ((status = 'active' and ended_at is null) or (status = 'completed' and ended_at is not null))
);

-- A cycle is owned through field_id. `created_at` deliberately never implies a
-- first harvest date or starts schedule generation.
create unique index harvest_cycles_one_active_commodity_per_field
  on public.harvest_cycles (field_id, lower(btrim(commodity)))
  where status = 'active';

create table public.harvest_schedules (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.harvest_cycles (id) on delete restrict,
  scheduled_date date not null,
  receiving_method text not null check (receiving_method in ('picked_up', 'delivered')),
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  completed_at date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'completed') = (completed_at is not null))
);

-- Late is calculated from scheduled_date and the operational date. Postponement
-- is represented by this history, not by a competing schedule status.
create table public.harvest_schedule_changes (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.harvest_schedules (id) on delete restrict,
  change_type text not null check (change_type in ('rescheduled', 'receiving_method_changed')),
  scope text not null default 'single' check (scope in ('single', 'following')),
  previous_scheduled_date date,
  new_scheduled_date date,
  previous_receiving_method text check (previous_receiving_method in ('picked_up', 'delivered')),
  new_receiving_method text check (new_receiving_method in ('picked_up', 'delivered')),
  created_at timestamptz not null default now(),
  check (
    (change_type = 'rescheduled'
      and previous_scheduled_date is not null
      and new_scheduled_date is not null
      and previous_scheduled_date <> new_scheduled_date
      and previous_receiving_method is null
      and new_receiving_method is null)
    or
    (change_type = 'receiving_method_changed'
      and previous_receiving_method is not null
      and new_receiving_method is not null
      and previous_receiving_method <> new_receiving_method
      and previous_scheduled_date is null
      and new_scheduled_date is null)
  )
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_number text not null unique,
  transaction_date date not null,
  transaction_time time,
  seller_type text not null check (seller_type in ('partner_farmer', 'general_seller')),
  farmer_id uuid references public.farmers (id) on delete restrict,
  seller_name_snapshot text not null check (length(btrim(seller_name_snapshot)) > 0),
  schedule_id uuid references public.harvest_schedules (id) on delete restrict,
  cycle_id uuid references public.harvest_cycles (id) on delete restrict,
  payment_status text not null check (payment_status in ('paid', 'unpaid')),
  total_net_weight_kg integer not null default 0 check (total_net_weight_kg >= 0),
  total_amount bigint not null default 0 check (total_amount >= 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (seller_type = 'partner_farmer' and farmer_id is not null)
    or
    (seller_type = 'general_seller' and farmer_id is null)
  )
);

create table public.transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions (id) on delete restrict,
  commodity text not null check (length(btrim(commodity)) > 0),
  weighing_method text not null check (weighing_method in ('direct_total', 'per_sack', 'per_crate')),
  gross_weight_kg integer not null check (gross_weight_kg >= 0),
  deduction_weight_kg integer not null default 0 check (deduction_weight_kg >= 0 and deduction_weight_kg <= gross_weight_kg),
  net_weight_kg integer generated always as (gross_weight_kg - deduction_weight_kg) stored,
  price_per_kg bigint not null check (price_per_kg >= 0),
  subtotal bigint generated always as (((gross_weight_kg - deduction_weight_kg)::bigint) * price_per_kg) stored,
  created_at timestamptz not null default now()
);

create table public.transaction_container_weights (
  id uuid primary key default gen_random_uuid(),
  transaction_item_id uuid not null references public.transaction_items (id) on delete restrict,
  container_type text not null check (container_type in ('sack', 'crate')),
  sequence_number integer not null check (sequence_number >= 1),
  weight_kg integer not null check (weight_kg > 0),
  created_at timestamptz not null default now(),
  unique (transaction_item_id, sequence_number)
);

create or replace function public.validate_transaction_container_weight()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  item_method text;
begin
  select weighing_method into item_method
  from public.transaction_items
  where id = new.transaction_item_id;

  if item_method is null then
    raise exception 'Transaction item % does not exist.', new.transaction_item_id;
  end if;

  if (item_method = 'per_sack' and new.container_type <> 'sack')
    or (item_method = 'per_crate' and new.container_type <> 'crate')
    or item_method = 'direct_total' then
    raise exception 'Container type must match the transaction item weighing method.';
  end if;

  return new;
end;
$$;

create trigger transaction_container_weights_validate_type
before insert or update on public.transaction_container_weights
for each row execute function public.validate_transaction_container_weight();

-- Stored transaction totals are audited snapshots kept in sync from items. They
-- are never accepted as independent client calculations.
create or replace function public.refresh_transaction_totals()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    update public.transactions
    set total_net_weight_kg = coalesce((select sum(net_weight_kg) from public.transaction_items where transaction_id = old.transaction_id), 0),
        total_amount = coalesce((select sum(subtotal) from public.transaction_items where transaction_id = old.transaction_id), 0)
    where id = old.transaction_id;
    return null;
  end if;

  if tg_op = 'UPDATE' and old.transaction_id is distinct from new.transaction_id then
    update public.transactions
    set total_net_weight_kg = coalesce((select sum(net_weight_kg) from public.transaction_items where transaction_id = old.transaction_id), 0),
        total_amount = coalesce((select sum(subtotal) from public.transaction_items where transaction_id = old.transaction_id), 0)
    where id = old.transaction_id;
  end if;

  update public.transactions
  set total_net_weight_kg = coalesce((select sum(net_weight_kg) from public.transaction_items where transaction_id = new.transaction_id), 0),
      total_amount = coalesce((select sum(subtotal) from public.transaction_items where transaction_id = new.transaction_id), 0)
  where id = new.transaction_id;

  return null;
end;
$$;

create trigger transaction_items_refresh_transaction_totals
after insert or update or delete on public.transaction_items
for each row execute function public.refresh_transaction_totals();

create table public.totalans (
  id uuid primary key default gen_random_uuid(),
  totalan_number text not null unique,
  farmer_id uuid not null references public.farmers (id) on delete restrict,
  finalized_at timestamptz not null default now(),
  total_net_weight_kg integer not null check (total_net_weight_kg >= 0),
  gross_harvest_amount bigint not null check (gross_harvest_amount >= 0),
  kasbon_deduction_amount bigint not null default 0 check (kasbon_deduction_amount >= 0),
  final_payment_amount bigint not null check (final_payment_amount >= 0),
  status text not null default 'finalized' check (status = 'finalized'),
  created_at timestamptz not null default now(),
  check (kasbon_deduction_amount <= gross_harvest_amount),
  check (final_payment_amount = gross_harvest_amount - kasbon_deduction_amount)
);

create table public.totalan_transactions (
  totalan_id uuid not null references public.totalans (id) on delete restrict,
  transaction_id uuid not null unique references public.transactions (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (totalan_id, transaction_id)
);

create or replace function public.validate_totalan_transaction()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  totalan_farmer_id uuid;
  transaction_farmer_id uuid;
  transaction_seller_type text;
  transaction_payment_status text;
begin
  select farmer_id into totalan_farmer_id from public.totalans where id = new.totalan_id;
  select farmer_id, seller_type, payment_status
    into transaction_farmer_id, transaction_seller_type, transaction_payment_status
  from public.transactions where id = new.transaction_id;

  if transaction_seller_type <> 'partner_farmer'
    or transaction_farmer_id is distinct from totalan_farmer_id
    or transaction_payment_status <> 'unpaid' then
    raise exception 'Only unpaid partner-farmer transactions for the same farmer may enter a totalan.';
  end if;

  return new;
end;
$$;

create trigger totalan_transactions_validate_transaction
before insert on public.totalan_transactions
for each row execute function public.validate_totalan_transaction();

create table public.kasbon_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.farmers (id) on delete restrict,
  entry_date date not null,
  entry_type text not null check (entry_type in ('advance', 'totalan_deduction')),
  amount bigint not null check (amount > 0),
  notes text not null default '',
  related_totalan_id uuid unique references public.totalans (id) on delete restrict,
  created_at timestamptz not null default now(),
  check (
    (entry_type = 'advance' and related_totalan_id is null)
    or (entry_type = 'totalan_deduction' and related_totalan_id is not null)
  )
);

create or replace function public.validate_kasbon_ledger_entry()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  current_balance bigint;
  totalan_farmer_id uuid;
  totalan_deduction bigint;
begin
  if new.entry_type <> 'totalan_deduction' then
    return new;
  end if;

  -- The farmer lock makes a future finalize-totalan RPC safe from concurrent
  -- deductions for the same ledger balance.
  perform 1 from public.farmers where id = new.farmer_id for update;

  select farmer_id, kasbon_deduction_amount
    into totalan_farmer_id, totalan_deduction
  from public.totalans
  where id = new.related_totalan_id;

  if totalan_farmer_id is distinct from new.farmer_id
    or totalan_deduction is distinct from new.amount then
    raise exception 'Kasbon deduction must match its totalan farmer and deduction amount.';
  end if;

  select coalesce(sum(case when entry_type = 'advance' then amount else -amount end), 0)
    into current_balance
  from public.kasbon_ledger_entries
  where farmer_id = new.farmer_id;

  if new.amount > current_balance then
    raise exception 'Kasbon deduction cannot exceed the current farmer balance.';
  end if;

  return new;
end;
$$;

create trigger kasbon_ledger_entries_validate_deduction
before insert on public.kasbon_ledger_entries
for each row execute function public.validate_kasbon_ledger_entry();

create or replace function public.prevent_finalized_financial_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Finalized financial history is immutable.';
end;
$$;

create trigger totalans_prevent_update_or_delete
before update or delete on public.totalans
for each row execute function public.prevent_finalized_financial_change();

create trigger kasbon_ledger_entries_prevent_update_or_delete
before update or delete on public.kasbon_ledger_entries
for each row execute function public.prevent_finalized_financial_change();

create view public.farmer_kasbon_balances
with (security_invoker = true)
as
select
  farmers.id as farmer_id,
  coalesce(sum(case when kasbon_ledger_entries.entry_type = 'advance' then kasbon_ledger_entries.amount else -kasbon_ledger_entries.amount end), 0)::bigint as balance_amount
from public.farmers
left join public.kasbon_ledger_entries on kasbon_ledger_entries.farmer_id = farmers.id
group by farmers.id;

create view public.transaction_payment_states
with (security_invoker = true)
as
select
  transactions.id as transaction_id,
  case
    when totalan_transactions.transaction_id is not null then 'included_in_totalan'
    else transactions.payment_status
  end as effective_payment_status
from public.transactions
left join public.totalan_transactions on totalan_transactions.transaction_id = transactions.id;

create index farmers_status_idx on public.farmers (status);
create index fields_farmer_id_idx on public.fields (farmer_id);
create index harvest_cycles_field_id_idx on public.harvest_cycles (field_id);
create index harvest_cycles_status_idx on public.harvest_cycles (status);
create index harvest_schedules_cycle_id_idx on public.harvest_schedules (cycle_id);
create index harvest_schedules_scheduled_date_idx on public.harvest_schedules (scheduled_date);
create index harvest_schedules_status_date_idx on public.harvest_schedules (status, scheduled_date);
create index harvest_schedule_changes_schedule_id_created_at_idx on public.harvest_schedule_changes (schedule_id, created_at desc);
create index transactions_transaction_date_idx on public.transactions (transaction_date desc);
create index transactions_farmer_id_date_idx on public.transactions (farmer_id, transaction_date desc) where farmer_id is not null;
create index transactions_seller_type_date_idx on public.transactions (seller_type, transaction_date desc);
create index transactions_schedule_id_idx on public.transactions (schedule_id) where schedule_id is not null;
create index transaction_items_transaction_id_idx on public.transaction_items (transaction_id);
create index transaction_container_weights_item_id_idx on public.transaction_container_weights (transaction_item_id);
create index totalans_farmer_id_finalized_at_idx on public.totalans (farmer_id, finalized_at desc);
create index kasbon_ledger_entries_farmer_date_idx on public.kasbon_ledger_entries (farmer_id, entry_date desc, created_at desc);

create trigger farmers_set_updated_at before update on public.farmers
for each row execute function public.set_updated_at();
create trigger fields_set_updated_at before update on public.fields
for each row execute function public.set_updated_at();
create trigger harvest_cycles_set_updated_at before update on public.harvest_cycles
for each row execute function public.set_updated_at();
create trigger harvest_schedules_set_updated_at before update on public.harvest_schedules
for each row execute function public.set_updated_at();
create trigger transactions_set_updated_at before update on public.transactions
for each row execute function public.set_updated_at();

alter table public.app_admins enable row level security;
alter table public.farmers enable row level security;
alter table public.fields enable row level security;
alter table public.harvest_cycles enable row level security;
alter table public.harvest_schedules enable row level security;
alter table public.harvest_schedule_changes enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_items enable row level security;
alter table public.transaction_container_weights enable row level security;
alter table public.totalans enable row level security;
alter table public.totalan_transactions enable row level security;
alter table public.kasbon_ledger_entries enable row level security;

create policy "admin access to farmers" on public.farmers for all to authenticated using (public.is_current_admin()) with check (public.is_current_admin());
create policy "admin access to fields" on public.fields for all to authenticated using (public.is_current_admin()) with check (public.is_current_admin());
create policy "admin access to harvest cycles" on public.harvest_cycles for all to authenticated using (public.is_current_admin()) with check (public.is_current_admin());
create policy "admin access to harvest schedules" on public.harvest_schedules for all to authenticated using (public.is_current_admin()) with check (public.is_current_admin());
create policy "admin access to harvest schedule changes" on public.harvest_schedule_changes for all to authenticated using (public.is_current_admin()) with check (public.is_current_admin());
create policy "admin access to transactions" on public.transactions for all to authenticated using (public.is_current_admin()) with check (public.is_current_admin());
create policy "admin access to transaction items" on public.transaction_items for all to authenticated using (public.is_current_admin()) with check (public.is_current_admin());
create policy "admin access to transaction container weights" on public.transaction_container_weights for all to authenticated using (public.is_current_admin()) with check (public.is_current_admin());
create policy "admin access to totalans" on public.totalans for all to authenticated using (public.is_current_admin()) with check (public.is_current_admin());
create policy "admin access to totalan transactions" on public.totalan_transactions for all to authenticated using (public.is_current_admin()) with check (public.is_current_admin());
create policy "admin access to kasbon ledger entries" on public.kasbon_ledger_entries for all to authenticated using (public.is_current_admin()) with check (public.is_current_admin());
