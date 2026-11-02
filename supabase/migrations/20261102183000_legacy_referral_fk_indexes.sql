-- Maintain efficient foreign-key checks for preserved, retired referral rows.
begin;
create index if not exists referrals_owner_garage_id_idx
  on public.referrals(owner_garage_id);
create index if not exists referrals_broker_garage_id_idx
  on public.referrals(broker_garage_id);
commit;
