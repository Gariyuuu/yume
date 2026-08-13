-- SEC-001: subscription_entitlements was created in 0001_init.sql without
-- RLS, same "table created with RLS disabled" mistake fixed for other
-- tables in 0006_phase4_rls.sql and 0016_moderation_rls.sql. No
-- application code reads or writes this table yet (billing/premium tier
-- is schema-only, deliberately inactive), so there is no client access
-- to preserve — enable RLS with zero policies, same pattern as
-- game_round_secrets (0014) and rate_limit_counters (0016). Only the
-- service-role client can read/write until a real billing feature is
-- deliberately wired up, at which point real policies belong here.
alter table subscription_entitlements enable row level security;
