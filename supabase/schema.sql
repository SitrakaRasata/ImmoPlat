create type profile_role as enum ('client', 'agent');

create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       profile_role not null default 'client',
  firstname  text,
  lastname   text,
  created_at timestamptz not null default now()
);

create table properties (
  id           uuid primary key default gen_random_uuid(),
  agent_id     uuid not null references profiles(id) on delete cascade,
  title        text not null,
  description  text,
  price        numeric(12, 2),
  city         text,
  is_published boolean not null default false,
  created_at   timestamptz not null default now()
);

-- The role is never read from client-supplied metadata: signup always produces
-- a client, promotion to agent is a separate path.
--
-- search_path is set to empty, not to public: pg_temp is implicitly searched
-- first for unqualified relation names no matter what search_path says, so
-- "set search_path = public" still lets a caller shadow profiles with a temp
-- table of the same name (CVE-2018-1058). An empty search_path resolves
-- nothing on its own, forcing every name below, including operators, to be
-- schema-qualified and therefore immune to that shadowing.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, firstname, lastname)
  values (new.id,
          new.raw_user_meta_data ->> 'firstname',
          new.raw_user_meta_data ->> 'lastname');
  return new;
end;
$$;

revoke execute on function handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Same empty search_path rationale as handle_new_user() above.
create function get_profile_role() returns public.profile_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid()
$$;
revoke execute on function get_profile_role() from public;
grant execute on function get_profile_role() to authenticated;

alter table profiles enable row level security;
alter table properties enable row level security;

grant usage on schema public to anon, authenticated;
grant select on profiles to authenticated;
grant select on properties to anon, authenticated;

create policy profiles_read_self on profiles for select to authenticated
  using (id = auth.uid());

-- Two policies rather than one: anon has no execute privilege on the
-- authorization functions, and has no reason to pay for calling them.
create policy properties_read_public on properties for select to anon
  using (is_published);

create table property_mandates (
  property_id uuid not null references properties(id) on delete cascade,
  agent_id    uuid not null references profiles(id) on delete cascade,
  expires_at  timestamptz,
  primary key (property_id, agent_id)
);

-- These two functions break the recursion: the properties policy consults
-- mandates, and the property_mandates policy consults properties, and
-- Postgres would raise 42P17 if each read the other table under RLS.
-- SECURITY DEFINER reads outside RLS. They take auth.uid() from the inside:
-- no identifier comes from the caller, or any authenticated user could query
-- someone else's mandates.
--
-- search_path is set to empty, not to public, for the same CVE-2018-1058
-- reason as handle_new_user() and get_profile_role() above: pg_temp is
-- searched first for unqualified names regardless of search_path, so every
-- name below is schema-qualified.
create function has_active_mandate(p_property uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.property_mandates
    where property_id = p_property and agent_id = auth.uid()
      and (expires_at is null or now() < expires_at)
  )
$$;
revoke execute on function has_active_mandate(uuid) from public;
grant execute on function has_active_mandate(uuid) to authenticated;

create function owns_property(p_property uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.properties where id = p_property and agent_id = auth.uid())
$$;
revoke execute on function owns_property(uuid) from public;
grant execute on function owns_property(uuid) to authenticated;

alter table property_mandates enable row level security;
grant select, insert, delete on property_mandates to authenticated;

create policy mandates_read on property_mandates for select to authenticated
  using (agent_id = auth.uid() or owns_property(property_id));
create policy mandates_insert on property_mandates for insert to authenticated
  with check (owns_property(property_id));
create policy mandates_delete on property_mandates for delete to authenticated
  using (owns_property(property_id));

create policy properties_read_agent on properties for select to authenticated
  using (is_published or agent_id = auth.uid() or has_active_mandate(id));
