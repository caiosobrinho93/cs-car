-- CS Car: internal team accounts + physical vehicle locations.
-- Apply after 001_initial.sql and 002_garage_contact_email.sql.
begin;
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
grant usage on schema private to anon,authenticated;
alter table public.garages alter column owner_id drop not null;
alter table public.garages drop constraint if exists garages_owner_id_key;
alter table public.garages drop constraint if exists garages_phone_check;
alter table public.garages alter column phone set default '';
alter table public.garages add column if not exists address text not null default '';
alter table public.garages add column if not exists notes text not null default '';
alter table public.garages add column if not exists active boolean not null default true;

create table if not exists public.team_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role text not null default 'seller' check (role in ('admin','seller')),
  can_edit_vehicles boolean not null default false,
  commission_percent numeric(5,2) not null default 0 check (commission_percent between 0 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.team_members enable row level security;
drop policy if exists admin_users_read_self on public.admin_users;
create policy admin_users_read_self on public.admin_users for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.admin_users from anon,authenticated;
grant select on public.admin_users to authenticated;
insert into public.team_members(user_id,role,can_edit_vehicles,commission_percent)
select user_id,'admin',true,0 from public.admin_users
on conflict(user_id) do update set role='admin',can_edit_vehicles=true;
alter table public.vehicles add column if not exists seller_id uuid references public.team_members(user_id) on delete set null;
update public.vehicles set seller_id=(select user_id from public.admin_users order by user_id limit 1) where seller_id is null;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.register_garage();
create or replace function public.reject_open_signup() returns trigger language plpgsql security definer set search_path=''
as $$ begin if new.invited_at is null then raise exception 'A CS Car account must be invited by an administrator.'; end if; return new; end; $$;
drop trigger if exists cs_car_invited_accounts_only on auth.users;
create trigger cs_car_invited_accounts_only before insert on auth.users for each row execute function public.reject_open_signup();
create or replace function private.is_team_member() returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.team_members t where t.user_id=(select auth.uid()) and t.active); $$;
create or replace function private.can_edit_vehicles() returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.team_members t where t.user_id=(select auth.uid()) and t.active and (t.role='admin' or t.can_edit_vehicles)); $$;
create or replace function private.my_commission_percent() returns numeric language sql stable security definer set search_path=''
as $$ select coalesce((select t.commission_percent from public.team_members t where t.user_id=(select auth.uid()) and t.active),0); $$;
create or replace function private.is_admin() returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.team_members t where t.user_id=(select auth.uid()) and t.active and t.role='admin'); $$;
create or replace function private.garage_approved(target uuid) returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.garages where id=target and status='approved' and active); $$;
revoke all on function private.is_team_member(),private.can_edit_vehicles(),private.my_commission_percent(),private.is_admin(),private.garage_approved(uuid) from public,anon,authenticated;
grant execute on function private.is_team_member(),private.can_edit_vehicles(),private.my_commission_percent(),private.is_admin() to authenticated;
grant execute on function private.garage_approved(uuid) to anon,authenticated;

create or replace function public.is_admin() returns boolean language sql stable security invoker set search_path=''
as $$ select private.is_admin(); $$;
revoke all on function public.is_admin() from public,anon,authenticated;
grant execute on function public.is_admin() to authenticated;
revoke all on function public.my_garage() from public,anon,authenticated;
revoke all on function public.garage_approved(uuid) from public,anon,authenticated;
create or replace function public.garage_approved(target uuid) returns boolean language sql stable security invoker set search_path=''
as $$ select private.garage_approved(target); $$;
grant execute on function public.garage_approved(uuid) to anon,authenticated;

create policy team_members_read_self_or_admin on public.team_members for select to authenticated using(user_id=(select auth.uid()) or private.is_admin());
create policy team_members_update_admin on public.team_members for update to authenticated using(private.is_admin()) with check(private.is_admin());
revoke all on public.team_members from anon,authenticated;
grant select on public.team_members to authenticated;
grant update(role,can_edit_vehicles,commission_percent,active,display_name) on public.team_members to authenticated;

drop policy if exists garages_read on public.garages;
create policy garages_read_team on public.garages for select to authenticated using(private.is_team_member());
drop policy if exists garages_public_approved on public.garages;
create policy garages_public_approved on public.garages for select to anon,authenticated using(status='approved' and active);
create policy garages_admin_insert on public.garages for insert to authenticated with check(private.is_admin());
create policy garages_admin_update on public.garages for update to authenticated using(private.is_admin()) with check(private.is_admin());
revoke all on public.garages from anon,authenticated;
grant select on public.garages to authenticated;
grant select(id,name) on public.garages to anon;
grant insert,update,delete on public.garages to authenticated;
drop policy if exists vehicles_read on public.vehicles;
create policy vehicles_public_or_team_read on public.vehicles for select to anon,authenticated
using((status in ('available','reserved') and public.garage_approved(garage_id)) or private.is_team_member());
drop policy if exists terms_read on public.vehicle_terms;
create policy terms_team_read on public.vehicle_terms for select to authenticated using(private.is_team_member());
revoke all on public.referrals,public.referral_events from anon,authenticated;
drop policy if exists referrals_read on public.referrals;
drop policy if exists events_read on public.referral_events;

revoke all on function public.review_garage(uuid,text) from public,anon,authenticated;
revoke all on function public.save_vehicle(jsonb,numeric,numeric) from public,anon,authenticated;
revoke all on function public.create_referral(uuid,text,text) from public,anon,authenticated;
revoke all on function public.transition_referral(uuid,text) from public,anon,authenticated;
revoke all on function public.confirm_platform_receipt(uuid) from public,anon,authenticated;

create or replace function private.save_vehicle(vehicle_data jsonb) returns uuid language plpgsql security definer set search_path=''
as $$
declare vid uuid:=nullif(vehicle_data->>'id','')::uuid; gid uuid:=nullif(vehicle_data->>'garage_id','')::uuid; existing public.vehicles; g public.garages; final_price numeric:=(vehicle_data->>'price')::numeric; fee numeric; seller uuid; pct numeric;
begin
 if not private.is_team_member() or not private.can_edit_vehicles() then raise exception 'Sua conta só tem permissão de consulta.'; end if;
 if gid is null then raise exception 'Selecione o local do veículo.'; end if;
 if final_price is null or final_price<=0 then raise exception 'Informe o preço final anunciado.'; end if;
 select * into g from public.garages where id=gid and active;
 if not found then raise exception 'Local não encontrado ou inativo.'; end if;
 select * into existing from public.vehicles where id=vid for update;
 if found and existing.garage_id<>gid and not private.is_admin() then raise exception 'Somente o administrador pode mover um veículo para outro local.'; end if;
 seller:=coalesce(existing.seller_id,(select auth.uid()));
 select commission_percent into pct from public.team_members where user_id=seller and active;
 pct:=coalesce(pct,private.my_commission_percent());
 if exists(select 1 from jsonb_array_elements_text(coalesce(vehicle_data->'images','[]'::jsonb)) x where x not like 'https://%') then raise exception 'Fotos devem usar URLs HTTPS.'; end if;
 fee:=round(final_price*pct/100,2);
 insert into public.vehicles(id,garage_id,seller_id,brand,model,version,year,price,mileage,transmission,fuel,body,color,city,state,status,images,description,features)
 values(vid,gid,seller,trim(vehicle_data->>'brand'),trim(vehicle_data->>'model'),coalesce(vehicle_data->>'version',''),(vehicle_data->>'year')::integer,final_price,(vehicle_data->>'mileage')::integer,vehicle_data->>'transmission',vehicle_data->>'fuel',vehicle_data->>'body',vehicle_data->>'color',g.city,g.state,vehicle_data->>'status',array(select jsonb_array_elements_text(vehicle_data->'images')),coalesce(vehicle_data->>'description',''),array(select jsonb_array_elements_text(coalesce(vehicle_data->'features','[]'::jsonb))))
 on conflict(id) do update set garage_id=excluded.garage_id,seller_id=excluded.seller_id,brand=excluded.brand,model=excluded.model,version=excluded.version,year=excluded.year,price=excluded.price,mileage=excluded.mileage,transmission=excluded.transmission,fuel=excluded.fuel,body=excluded.body,color=excluded.color,city=excluded.city,state=excluded.state,status=excluded.status,images=excluded.images,description=excluded.description,features=excluded.features,updated_at=now();
 insert into public.vehicle_terms(vehicle_id,partner_fee,platform_fee) values(vid,fee,0) on conflict(vehicle_id) do update set partner_fee=excluded.partner_fee,platform_fee=0;
 return vid;
end; $$;
revoke all on function private.save_vehicle(jsonb) from public,anon,authenticated;
grant execute on function private.save_vehicle(jsonb) to authenticated;
create or replace function public.save_vehicle(vehicle_data jsonb) returns uuid language sql security invoker set search_path=''
as $$ select private.save_vehicle(vehicle_data); $$;
revoke all on function public.save_vehicle(jsonb) from public,anon,authenticated;
grant execute on function public.save_vehicle(jsonb) to authenticated;

drop policy if exists upload_own on storage.objects;
drop policy if exists update_own on storage.objects;
drop policy if exists delete_own on storage.objects;
drop policy if exists read_own on storage.objects;
create policy team_upload_vehicle_images on storage.objects for insert to authenticated
with check(bucket_id='vehicle-images' and private.can_edit_vehicles() and exists(select 1 from public.garages g where g.id::text=(storage.foldername(storage.objects.name))[1] and g.active));
create policy team_update_vehicle_images on storage.objects for update to authenticated
using(bucket_id='vehicle-images' and private.can_edit_vehicles() and exists(select 1 from public.garages g where g.id::text=(storage.foldername(storage.objects.name))[1] and g.active))
with check(bucket_id='vehicle-images' and private.can_edit_vehicles() and exists(select 1 from public.garages g where g.id::text=(storage.foldername(storage.objects.name))[1] and g.active));
create policy team_delete_vehicle_images on storage.objects for delete to authenticated
using(bucket_id='vehicle-images' and private.can_edit_vehicles() and exists(select 1 from public.garages g where g.id::text=(storage.foldername(storage.objects.name))[1] and g.active));
create policy team_read_vehicle_images on storage.objects for select to authenticated
using(bucket_id='vehicle-images' and private.is_team_member());
commit;
