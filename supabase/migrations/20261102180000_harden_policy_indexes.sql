-- Close the residual advisor findings after the internal team migration.
begin;

-- Signup guard runs only from the auth.users trigger; it is not an API RPC.
revoke all on function public.reject_open_signup() from public, anon, authenticated;

-- Avoid duplicate authenticated SELECT policy evaluation while preserving the
-- public catalog and full internal location visibility.
drop policy if exists garages_read_team on public.garages;
drop policy if exists garages_public_approved on public.garages;
create policy garages_public_approved on public.garages
  for select to anon using (status = 'approved' and active);
create policy garages_team_or_public_read on public.garages
  for select to authenticated
  using (private.is_team_member() or (status = 'approved' and active));

-- Legacy referral tables are intentionally inaccessible; explicit deny policies
-- make that boundary clear to PostgREST and the database advisor.
create policy referrals_no_client_access on public.referrals
  for all to anon, authenticated using (false) with check (false);
create policy referral_events_no_client_access on public.referral_events
  for all to anon, authenticated using (false) with check (false);

-- Cover foreign keys used for deletes, joins, and team/location lookups.
create index if not exists garages_owner_id_idx on public.garages(owner_id);
create index if not exists vehicles_seller_id_idx on public.vehicles(seller_id);
create index if not exists referral_events_actor_id_idx on public.referral_events(actor_id);
create index if not exists referral_events_referral_id_idx on public.referral_events(referral_id);

-- These legacy-only lookup indexes have no client or server path after the
-- referral feature was retired. Keep the rows and constraints, drop only indexes.
drop index if exists public.referrals_owner;
drop index if exists public.referrals_broker;

commit;
