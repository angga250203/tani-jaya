-- These policies existed in the linked cloud database outside the tracked
-- migration history. They use FOR ALL, which includes DELETE and overlaps the
-- explicit admin policies introduced by the preceding migration.

drop policy if exists "admin access to farmers" on public.farmers;
drop policy if exists "admin access to fields" on public.fields;
drop policy if exists "admin access to harvest cycles" on public.harvest_cycles;
drop policy if exists "admin access to harvest schedules" on public.harvest_schedules;
drop policy if exists "admin access to harvest schedule changes" on public.harvest_schedule_changes;
drop policy if exists "admin access to transactions" on public.transactions;
drop policy if exists "admin access to transaction items" on public.transaction_items;
drop policy if exists "admin access to transaction container weights" on public.transaction_container_weights;
drop policy if exists "admin access to totalans" on public.totalans;
drop policy if exists "admin access to totalan transactions" on public.totalan_transactions;
drop policy if exists "admin access to kasbon ledger entries" on public.kasbon_ledger_entries;
