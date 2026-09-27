-- Phase 6 security fix: mutation RPCs are callable only by authenticated users.
-- Private implementations retain their own Admin authorization checks.

REVOKE EXECUTE ON FUNCTION public.create_purchase(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_purchase(jsonb) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.create_purchase(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.create_purchase(jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_purchase(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_purchase(uuid, jsonb) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.update_purchase(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.update_purchase(uuid, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_sale(date, text, text, text, text, bigint, jsonb, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_sale(date, text, text, text, text, bigint, jsonb, bigint) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.create_sale(date, text, text, text, text, bigint, jsonb, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.create_sale(date, text, text, text, text, bigint, jsonb, bigint) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.record_sale_payment(uuid, date, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_sale_payment(uuid, date, bigint) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.record_sale_payment(uuid, date, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.record_sale_payment(uuid, date, bigint) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.correct_sale(uuid, text, text, text, text, bigint, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.correct_sale(uuid, text, text, text, text, bigint, jsonb, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.correct_sale(uuid, text, text, text, text, bigint, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.correct_sale(uuid, text, text, text, text, bigint, jsonb, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.cancel_sale(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_sale(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.cancel_sale(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.cancel_sale(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.delete_sale_without_payments(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_sale_without_payments(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.delete_sale_without_payments(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.delete_sale_without_payments(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.finalize_totalan(uuid, uuid[], date, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_totalan(uuid, uuid[], date, bigint) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.finalize_totalan(uuid, uuid[], date, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.finalize_totalan(uuid, uuid[], date, bigint) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_kasbon_advance(uuid, date, bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_kasbon_advance(uuid, date, bigint, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.create_kasbon_advance(uuid, date, bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.create_kasbon_advance(uuid, date, bigint, text) TO authenticated;
