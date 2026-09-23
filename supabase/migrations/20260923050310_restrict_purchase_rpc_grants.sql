-- Supabase function defaults grant EXECUTE to API roles at creation time.
-- Narrow the Purchase RPC boundary explicitly: only authenticated Admin calls
-- can pass the function's own Admin authorization guard.
revoke all on function public.create_purchase(jsonb) from anon, service_role;
revoke all on function public.update_purchase(uuid, jsonb) from anon, service_role;
revoke all on function private.create_purchase(jsonb) from anon, service_role;
revoke all on function private.update_purchase(uuid, jsonb) from anon, service_role;

grant execute on function public.create_purchase(jsonb) to authenticated;
grant execute on function public.update_purchase(uuid, jsonb) to authenticated;
grant execute on function private.create_purchase(jsonb) to authenticated;
grant execute on function private.update_purchase(uuid, jsonb) to authenticated;
