-- The primary Phase 4A migration intentionally made totalan_number nullable:
-- no approved human-readable numbering format exists. Supabase's generated
-- function types model TABLE text output as non-nullable, so keep the public
-- contract honest and return the required UUID only. The private operation
-- keeps its internal optional reference for a later approved numbering change.
drop function public.finalize_totalan(uuid, uuid[], date, bigint);

create function public.finalize_totalan(
  p_farmer_id uuid,
  p_transaction_ids uuid[],
  p_totalan_date date,
  p_kasbon_deduction_amount bigint default 0
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select result.totalan_id
  from private.finalize_totalan(
    p_farmer_id,
    p_transaction_ids,
    p_totalan_date,
    p_kasbon_deduction_amount
  ) as result;
$$;

revoke all on function public.finalize_totalan(uuid, uuid[], date, bigint) from public, anon, service_role;
grant execute on function public.finalize_totalan(uuid, uuid[], date, bigint) to authenticated;
