-- Store Auth email with each member profile so admins can manage accounts
-- through the normal authenticated client and existing team_members RLS.
begin;

alter table public.team_members add column if not exists email text not null default '';
update public.team_members t
set email = coalesce(u.email, '')
from auth.users u
where u.id = t.user_id and t.email = '';

create or replace function private.handle_member_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.team_members(user_id, display_name, email, role, can_edit_vehicles, commission_percent, active)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), ''),
    coalesce(new.email, ''),
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

commit;
