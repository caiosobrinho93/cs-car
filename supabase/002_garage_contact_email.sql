-- Execute uma vez em projetos que já executaram 001_initial.sql.
alter table public.garages add column if not exists contact_email text not null default '';
create or replace function public.register_garage() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.garages(owner_id,name,city,state,phone,contact_email)
 values(new.id,trim(new.raw_user_meta_data->>'garage_name'),trim(new.raw_user_meta_data->>'city'),upper(new.raw_user_meta_data->>'state'),new.raw_user_meta_data->>'phone',coalesce(new.email,''));
 return new;
end;$$;
