-- Allow ordinary member registration. Admins promote selected members to sellers.
begin;

drop trigger if exists cs_car_invited_accounts_only on auth.users;
drop function if exists public.reject_open_signup();

alter table public.team_members alter column role set default 'member';
alter table public.team_members drop constraint if exists team_members_role_check;
alter table public.team_members add constraint team_members_role_check
  check (role in ('admin', 'seller', 'member'));

create or replace function private.handle_member_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.team_members(user_id, display_name, role, can_edit_vehicles, commission_percent, active)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), ''),
    'member',
    false,
    0,
    true
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_member_signup() from public, anon, authenticated;
drop trigger if exists cs_car_member_signup on auth.users;
create trigger cs_car_member_signup
  after insert on auth.users
  for each row execute function private.handle_member_signup();

create or replace function private.is_team_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members t
    where t.user_id = (select auth.uid())
      and t.active
      and t.role in ('admin', 'seller')
  );
$$;

create or replace function private.can_edit_vehicles()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members t
    where t.user_id = (select auth.uid())
      and t.active
      and t.role in ('admin', 'seller')
      and (t.role = 'admin' or t.can_edit_vehicles)
  );
$$;

-- Avoid evaluating authenticated-only membership checks for anonymous catalog requests.
drop policy if exists vehicles_public_or_team_read on public.vehicles;
create policy vehicles_public_read on public.vehicles
  for select to anon
  using (status in ('available', 'reserved') and private.garage_approved(garage_id));
create policy vehicles_public_or_team_read on public.vehicles
  for select to authenticated
  using (
    (status in ('available', 'reserved') and private.garage_approved(garage_id))
    or private.is_team_member()
  );

commit;
