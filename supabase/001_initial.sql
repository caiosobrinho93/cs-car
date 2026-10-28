-- CS CAR — rede de intermediação. Execute UMA VEZ em projeto Supabase novo.
-- Substitui o rascunho anterior 001_initial.sql; não execute ambos.
-- Não contém veículos fictícios nem usuários de demonstração.
begin;
create table public.admin_users(user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admin_users enable row level security;
create table public.garages(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null unique references auth.users(id),
 name text not null check(char_length(name) between 1 and 120),
 city text not null check(char_length(city) between 1 and 100),
 state text not null check(state ~ '^[A-Z]{2}$'),
 phone text not null check(char_length(phone) between 10 and 20),
 contact_email text not null default '',
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now()
);
create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.admin_users where user_id=(select auth.uid()));
$$;
create function public.my_garage() returns uuid language sql stable security definer set search_path='' as $$
 select id from public.garages where owner_id=(select auth.uid()) and status='approved';
$$;
create function public.garage_approved(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.garages where id=target and status='approved');
$$;
create table public.vehicles(
 id uuid primary key default gen_random_uuid(),garage_id uuid not null references public.garages(id),
 brand text not null check(char_length(brand) between 1 and 160),model text not null check(char_length(model) between 1 and 160),
 version text not null default '' check(char_length(version)<=160),
 year integer not null check(year between 1900 and 2200),
 price numeric(12,2) not null check(price>0),mileage integer not null check(mileage>=0),
 transmission text not null check(transmission in ('Manual','Automático')),
 fuel text not null check(fuel in ('Flex','Gasolina','Diesel','Elétrico','Híbrido')),
 body text not null check(body in ('Hatch','Sedã','SUV','Picape','Cupê','Conversível','Van')),
 color text not null check(char_length(color) between 1 and 160),city text not null,state text not null,
 status text not null default 'draft' check(status in ('draft','available','reserved','sold')),
 images text[] not null check(cardinality(images) between 1 and 8),
 description text not null default '' check(char_length(description)<=5000),features text[] not null default '{}',
 featured boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
-- Comissões fora da tabela pública: não são expostas pelo catálogo/API anônima.
create table public.vehicle_terms(
 vehicle_id uuid primary key references public.vehicles(id) on delete cascade,
 partner_fee numeric(12,2) not null check(partner_fee>=0),platform_fee numeric(12,2) not null check(platform_fee>=0)
);
create table public.referrals(
 id uuid primary key default gen_random_uuid(),vehicle_id uuid not null references public.vehicles(id),
 owner_garage_id uuid not null references public.garages(id),broker_garage_id uuid not null references public.garages(id),
 buyer_name text not null check(char_length(buyer_name) between 1 and 120),
 buyer_phone text not null check(buyer_phone ~ '^[0-9]{10,15}$'),
 price numeric(12,2) not null,partner_fee numeric(12,2) not null,platform_fee numeric(12,2) not null,
 vehicle_label text not null,
 status text not null default 'new' check(status in ('new','visit','sold','paid','cancelled')),
 platform_received_at timestamptz,consent_at timestamptz not null default now(),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(owner_garage_id<>broker_garage_id),check(price>=partner_fee+platform_fee)
);
create unique index referral_duplicate on public.referrals(vehicle_id,broker_garage_id,buyer_phone) where status not in ('cancelled','paid');
create unique index one_sale_per_vehicle on public.referrals(vehicle_id) where status in ('sold','paid');
create index vehicles_catalog on public.vehicles(status,brand,price);
create index vehicles_owner on public.vehicles(garage_id);
create index referrals_owner on public.referrals(owner_garage_id);
create index referrals_broker on public.referrals(broker_garage_id);
create table public.referral_events(
 id bigint generated always as identity primary key,referral_id uuid not null references public.referrals(id),
 actor_id uuid not null references auth.users(id),event text not null,created_at timestamptz not null default now()
);
create function public.register_garage() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.garages(owner_id,name,city,state,phone)
 values(new.id,trim(new.raw_user_meta_data->>'garage_name'),trim(new.raw_user_meta_data->>'city'),upper(new.raw_user_meta_data->>'state'),new.raw_user_meta_data->>'phone',new.email);
 return new;
end;$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.register_garage();
create function public.review_garage(target_id uuid,new_status text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Acesso restrito à CS Car.'; end if;
 if new_status not in ('approved','rejected') then raise exception 'Status inválido.';end if;
 update public.garages set status=new_status where id=target_id;
 if not found then raise exception 'Garagem não encontrada.';end if;
end;$$;
create function public.save_vehicle(vehicle_data jsonb,broker_commission numeric,cs_commission numeric) returns uuid
language plpgsql security definer set search_path='' as $$
declare vid uuid:=(vehicle_data->>'id')::uuid; gid uuid:=public.my_garage(); existing public.vehicles; g public.garages; final_price numeric:=(vehicle_data->>'price')::numeric;
begin
 if gid is null then raise exception 'Sua garagem precisa estar aprovada.';end if;
 if final_price is null or broker_commission is null or cs_commission is null or broker_commission<0 or cs_commission<0 or broker_commission+cs_commission>final_price then raise exception 'Condições comerciais inválidas.';end if;
 select * into g from public.garages where id=gid;
 select * into existing from public.vehicles where id=vid for update;
 if found and existing.garage_id<>gid then raise exception 'Este anúncio pertence a outra garagem.';end if;
 if existing.status='sold' and (vehicle_data->>'status')<>'sold' and exists(select 1 from public.referrals where vehicle_id=vid and status in ('sold','paid')) then raise exception 'Uma venda confirmada não pode ser reaberta por este formulário.';end if;
 if exists(select 1 from jsonb_array_elements_text(vehicle_data->'images') x where x not like 'https://%') then raise exception 'Fotos devem usar URLs HTTPS.';end if;
 insert into public.vehicles(id,garage_id,brand,model,version,year,price,mileage,transmission,fuel,body,color,city,state,status,images,description,features)
 values(vid,gid,trim(vehicle_data->>'brand'),trim(vehicle_data->>'model'),vehicle_data->>'version',(vehicle_data->>'year')::integer,final_price,(vehicle_data->>'mileage')::integer,vehicle_data->>'transmission',vehicle_data->>'fuel',vehicle_data->>'body',vehicle_data->>'color',g.city,g.state,vehicle_data->>'status',array(select jsonb_array_elements_text(vehicle_data->'images')),vehicle_data->>'description',array(select jsonb_array_elements_text(vehicle_data->'features')))
 on conflict(id) do update set brand=excluded.brand,model=excluded.model,version=excluded.version,year=excluded.year,price=excluded.price,mileage=excluded.mileage,transmission=excluded.transmission,fuel=excluded.fuel,body=excluded.body,color=excluded.color,status=excluded.status,images=excluded.images,description=excluded.description,features=excluded.features,updated_at=now()
 where public.vehicles.garage_id=gid;
 if not found then raise exception 'Este anúncio pertence a outra garagem.';end if;
 insert into public.vehicle_terms(vehicle_id,partner_fee,platform_fee) values(vid,broker_commission,cs_commission)
 on conflict(vehicle_id) do update set partner_fee=excluded.partner_fee,platform_fee=excluded.platform_fee;
 return vid;
end;$$;
create function public.create_referral(target_vehicle uuid,customer_name text,customer_phone text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v public.vehicles;t public.vehicle_terms;gid uuid:=public.my_garage();rid uuid;
begin
 if gid is null then raise exception 'Sua garagem precisa estar aprovada.';end if;
 select * into v from public.vehicles where id=target_vehicle for update;
 if not found or v.status<>'available' or not public.garage_approved(v.garage_id) then raise exception 'Veículo indisponível.';end if;
 if v.garage_id=gid then raise exception 'Você não pode indicar comprador para seu próprio anúncio.';end if;
 select * into strict t from public.vehicle_terms where vehicle_id=v.id;
 insert into public.referrals(vehicle_id,owner_garage_id,broker_garage_id,buyer_name,buyer_phone,price,partner_fee,platform_fee,vehicle_label)
 values(v.id,v.garage_id,gid,trim(customer_name),regexp_replace(customer_phone,'[^0-9]','','g'),v.price,t.partner_fee,t.platform_fee,v.brand||' '||v.model) returning id into rid;
 insert into public.referral_events(referral_id,actor_id,event) values(rid,auth.uid(),'new');
 return rid;
end;$$;
create function public.transition_referral(referral_id uuid,next_status text) returns void
language plpgsql security definer set search_path='' as $$
declare r public.referrals;gid uuid:=public.my_garage();aid boolean:=public.is_admin();vid uuid;vstatus text;
begin
 -- Sempre trava o veículo antes da indicação para serializar vendas concorrentes.
 select vehicle_id into vid from public.referrals where id=referral_id;
 if vid is null then raise exception 'Indicação não encontrada.';end if;
 select status into vstatus from public.vehicles where id=vid for update;
 select * into r from public.referrals where id=referral_id for update;
 if not aid and (gid is null or gid not in (r.owner_garage_id,r.broker_garage_id)) then raise exception 'Acesso negado.';end if;
 if next_status='visit' and r.status='new' and (aid or gid=r.owner_garage_id) then null;
 elsif next_status='sold' and r.status in ('new','visit') and (aid or gid=r.owner_garage_id) then
  if vstatus='sold' then raise exception 'Veículo já vendido.';end if;
  update public.vehicles set status='sold',updated_at=now() where id=vid;
  insert into public.referral_events(referral_id,actor_id,event)
  select id,auth.uid(),'cancelled: vehicle sold' from public.referrals where vehicle_id=vid and id<>r.id and status in ('new','visit');
  update public.referrals set status='cancelled',updated_at=now() where vehicle_id=vid and id<>r.id and status in ('new','visit');
 elsif next_status='paid' and r.status='sold' and (aid or gid=r.broker_garage_id) then null;
 elsif next_status='cancelled' and r.status in ('new','visit') then null;
 else raise exception 'Transição não permitida para seu acesso.';
 end if;
 update public.referrals set status=next_status,updated_at=now() where id=r.id;
 insert into public.referral_events(referral_id,actor_id,event) values(r.id,auth.uid(),next_status);
end;$$;
create function public.confirm_platform_receipt(referral_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Acesso restrito à CS Car.';end if;
 update public.referrals set platform_received_at=now(),updated_at=now() where id=referral_id and status in ('sold','paid') and platform_received_at is null;
 if not found then raise exception 'Recebimento já registrado ou venda não confirmada.';end if;
 insert into public.referral_events(referral_id,actor_id,event) values(referral_id,auth.uid(),'platform_received');
end;$$;
alter table public.garages enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_terms enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_events enable row level security;
create policy garages_read on public.garages for select to authenticated using(owner_id=(select auth.uid()) or public.is_admin() or (public.my_garage() is not null and status='approved'));
create policy vehicles_read on public.vehicles for select to anon,authenticated using((status in ('available','reserved') and public.garage_approved(garage_id)) or garage_id=public.my_garage() or public.is_admin());
create policy terms_read on public.vehicle_terms for select to authenticated using(public.my_garage() is not null or public.is_admin());
create policy referrals_read on public.referrals for select to authenticated using(public.is_admin() or public.my_garage() in (owner_garage_id,broker_garage_id));
create policy events_read on public.referral_events for select to authenticated using(exists(select 1 from public.referrals r where r.id=referral_id));
-- Sem escrita direta. As funções validam autoria, aprovação, preço e transições.
revoke all on public.admin_users,public.garages,public.vehicles,public.vehicle_terms,public.referrals,public.referral_events from anon,authenticated;
grant select on public.vehicles to anon,authenticated;
grant select on public.garages,public.vehicle_terms,public.referrals,public.referral_events to authenticated;
revoke all on function public.is_admin(),public.my_garage(),public.garage_approved(uuid),public.register_garage(),public.review_garage(uuid,text),public.save_vehicle(jsonb,numeric,numeric),public.create_referral(uuid,text,text),public.transition_referral(uuid,text),public.confirm_platform_receipt(uuid) from public,anon,authenticated;
grant execute on function public.is_admin(),public.my_garage(),public.garage_approved(uuid) to anon,authenticated;
grant execute on function public.review_garage(uuid,text),public.save_vehicle(jsonb,numeric,numeric),public.create_referral(uuid,text,text),public.transition_referral(uuid,text),public.confirm_platform_receipt(uuid) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('vehicle-images','vehicle-images',true,5242880,array['image/jpeg','image/png','image/webp']);
create policy upload_own on storage.objects for insert to authenticated with check(bucket_id='vehicle-images' and (storage.foldername(name))[1]=public.my_garage()::text);
create policy update_own on storage.objects for update to authenticated using(bucket_id='vehicle-images' and (storage.foldername(name))[1]=public.my_garage()::text) with check(bucket_id='vehicle-images' and (storage.foldername(name))[1]=public.my_garage()::text);
create policy delete_own on storage.objects for delete to authenticated using(bucket_id='vehicle-images' and (storage.foldername(name))[1]=public.my_garage()::text);
create policy read_own on storage.objects for select to authenticated using(bucket_id='vehicle-images' and (storage.foldername(name))[1]=public.my_garage()::text);
commit;
-- Após cadastrar seu usuário pelo site, promova-o no SQL Editor (nunca no frontend):
-- insert into public.admin_users(user_id) values('UUID-DA-SUA-CONTA');
-- update public.garages set status='approved' where owner_id='UUID-DA-SUA-CONTA';
-- Fotos são públicas mesmo em rascunhos; nunca envie documentos pessoais ao bucket.
