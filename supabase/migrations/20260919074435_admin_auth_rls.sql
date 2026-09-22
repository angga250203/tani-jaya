-- Authentication and Row Level Security for the single internal Admin model.
-- Application data remains inaccessible to anon; every operational policy
-- delegates authorization to the existing auth.users-backed allowlist.

create schema if not exists private;

create or replace function private.is_current_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.app_admins
      where user_id = (select auth.uid())
    );
$$;

revoke all on function private.is_current_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_current_admin() to authenticated;

-- Keep the generated public function contract, but harden its implementation.
-- Policies use the private function directly; this wrapper is safe for an
-- authenticated caller and reports only their own allowlist membership.
create or replace function public.is_current_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.is_current_admin();
$$;

revoke all on function public.is_current_admin() from public;
grant execute on function public.is_current_admin() to authenticated;

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

-- app_admins is provisioned only through the Supabase Dashboard or a secure
-- administrative workflow. Normal authenticated users cannot enumerate or
-- mutate the allowlist, and anon has no table grants anywhere below.
revoke all on table public.app_admins from anon, authenticated;

revoke all on table public.farmers from anon, authenticated;
revoke all on table public.fields from anon, authenticated;
revoke all on table public.harvest_cycles from anon, authenticated;
revoke all on table public.harvest_schedules from anon, authenticated;
revoke all on table public.harvest_schedule_changes from anon, authenticated;
revoke all on table public.transactions from anon, authenticated;
revoke all on table public.transaction_items from anon, authenticated;
revoke all on table public.transaction_container_weights from anon, authenticated;
revoke all on table public.totalans from anon, authenticated;
revoke all on table public.totalan_transactions from anon, authenticated;
revoke all on table public.kasbon_ledger_entries from anon, authenticated;

grant select, insert, update on table public.farmers to authenticated;
grant select, insert, update on table public.fields to authenticated;
grant select, insert, update on table public.harvest_cycles to authenticated;
grant select, insert, update on table public.harvest_schedules to authenticated;
grant select, insert on table public.harvest_schedule_changes to authenticated;
grant select, insert, update on table public.transactions to authenticated;
grant select, insert, update on table public.transaction_items to authenticated;
grant select, insert, update on table public.transaction_container_weights to authenticated;
grant select, insert on table public.totalans to authenticated;
grant select, insert on table public.totalan_transactions to authenticated;
grant select, insert on table public.kasbon_ledger_entries to authenticated;

create policy "admins_select_farmers"
on public.farmers for select to authenticated
using ((select private.is_current_admin()));
create policy "admins_insert_farmers"
on public.farmers for insert to authenticated
with check ((select private.is_current_admin()));
create policy "admins_update_farmers"
on public.farmers for update to authenticated
using ((select private.is_current_admin()))
with check ((select private.is_current_admin()));

create policy "admins_select_fields"
on public.fields for select to authenticated
using ((select private.is_current_admin()));
create policy "admins_insert_fields"
on public.fields for insert to authenticated
with check ((select private.is_current_admin()));
create policy "admins_update_fields"
on public.fields for update to authenticated
using ((select private.is_current_admin()))
with check ((select private.is_current_admin()));

create policy "admins_select_harvest_cycles"
on public.harvest_cycles for select to authenticated
using ((select private.is_current_admin()));
create policy "admins_insert_harvest_cycles"
on public.harvest_cycles for insert to authenticated
with check ((select private.is_current_admin()));
create policy "admins_update_harvest_cycles"
on public.harvest_cycles for update to authenticated
using ((select private.is_current_admin()))
with check ((select private.is_current_admin()));

create policy "admins_select_harvest_schedules"
on public.harvest_schedules for select to authenticated
using ((select private.is_current_admin()));
create policy "admins_insert_harvest_schedules"
on public.harvest_schedules for insert to authenticated
with check ((select private.is_current_admin()));
create policy "admins_update_harvest_schedules"
on public.harvest_schedules for update to authenticated
using ((select private.is_current_admin()))
with check ((select private.is_current_admin()));

-- Schedule changes are append-only operational history.
create policy "admins_select_harvest_schedule_changes"
on public.harvest_schedule_changes for select to authenticated
using ((select private.is_current_admin()));
create policy "admins_insert_harvest_schedule_changes"
on public.harvest_schedule_changes for insert to authenticated
with check ((select private.is_current_admin()));

create policy "admins_select_transactions"
on public.transactions for select to authenticated
using ((select private.is_current_admin()));
create policy "admins_insert_transactions"
on public.transactions for insert to authenticated
with check ((select private.is_current_admin()));
create policy "admins_update_transactions"
on public.transactions for update to authenticated
using ((select private.is_current_admin()))
with check ((select private.is_current_admin()));

create policy "admins_select_transaction_items"
on public.transaction_items for select to authenticated
using ((select private.is_current_admin()));
create policy "admins_insert_transaction_items"
on public.transaction_items for insert to authenticated
with check ((select private.is_current_admin()));
create policy "admins_update_transaction_items"
on public.transaction_items for update to authenticated
using ((select private.is_current_admin()))
with check ((select private.is_current_admin()));

create policy "admins_select_transaction_container_weights"
on public.transaction_container_weights for select to authenticated
using ((select private.is_current_admin()));
create policy "admins_insert_transaction_container_weights"
on public.transaction_container_weights for insert to authenticated
with check ((select private.is_current_admin()));
create policy "admins_update_transaction_container_weights"
on public.transaction_container_weights for update to authenticated
using ((select private.is_current_admin()))
with check ((select private.is_current_admin()));

-- Finalized financial history can be created by an admin but is not updated or
-- deleted. Database triggers enforce the corresponding business invariants.
create policy "admins_select_totalans"
on public.totalans for select to authenticated
using ((select private.is_current_admin()));
create policy "admins_insert_totalans"
on public.totalans for insert to authenticated
with check ((select private.is_current_admin()));

create policy "admins_select_totalan_transactions"
on public.totalan_transactions for select to authenticated
using ((select private.is_current_admin()));
create policy "admins_insert_totalan_transactions"
on public.totalan_transactions for insert to authenticated
with check ((select private.is_current_admin()));

create policy "admins_select_kasbon_ledger_entries"
on public.kasbon_ledger_entries for select to authenticated
using ((select private.is_current_admin()));
create policy "admins_insert_kasbon_ledger_entries"
on public.kasbon_ledger_entries for insert to authenticated
with check ((select private.is_current_admin()));

-- The existing views use security_invoker and therefore inherit the protected
-- base table policies. Explicit grants make that intent clear.
revoke all on table public.farmer_kasbon_balances from anon, authenticated;
revoke all on table public.transaction_payment_states from anon, authenticated;
grant select on table public.farmer_kasbon_balances to authenticated;
grant select on table public.transaction_payment_states to authenticated;
