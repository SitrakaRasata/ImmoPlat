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

-- profiles is the third table with the same inert-grant hazard audited on
-- properties and property_mandates below: the bootstrap's ALTER DEFAULT
-- PRIVILEGES already grants anon and authenticated every privilege here, so a
-- narrow GRANT without a preceding REVOKE would restrict nothing. Currently
-- harmless — no INSERT/UPDATE/DELETE policy exists for either role, so RLS
-- default-denies those commands regardless — but the REVOKE keeps that true
-- by construction rather than by the accident of no one having written a
-- matching policy yet.
revoke all on profiles from anon, authenticated;
grant select on profiles to authenticated;

revoke all on properties from anon;
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
-- relation and type name below is schema-qualified. Built-in functions like
-- now() are not: pg_catalog is always searched implicitly and pg_temp cannot
-- shadow it for functions, so an unqualified now() carries no such risk.
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

-- Same inert-grant hazard as the properties UPDATE case above: property_mandates
-- is created after the platform bootstrap's ALTER DEFAULT PRIVILEGES, so anon
-- and authenticated already hold every privilege on it, UPDATE included, even
-- though no UPDATE policy is ever defined below. The REVOKE makes the GRANT
-- list below authoritative instead of redundant.
revoke all on property_mandates from anon, authenticated;
grant select, insert, delete on property_mandates to authenticated;

create policy mandates_read on property_mandates for select to authenticated
  using (agent_id = auth.uid() or owns_property(property_id));
create policy mandates_insert on property_mandates for insert to authenticated
  with check (owns_property(property_id));
create policy mandates_delete on property_mandates for delete to authenticated
  using (owns_property(property_id));

create policy properties_read_agent on properties for select to authenticated
  using (is_published or agent_id = auth.uid() or has_active_mandate(id));

grant insert, delete on properties to authenticated;

-- The platform bootstrap (see supabase-shim.sql) already grants UPDATE on
-- every column to anon and authenticated via ALTER DEFAULT PRIVILEGES, so the
-- column GRANT below adds nothing on its own: it must be preceded by this
-- REVOKE, covering both roles, to take the broad privilege away first.
-- agent_id is granted to nobody. WITH CHECK only sees the row after the
-- update, so it cannot express "agent_id did not change" — without this
-- column restriction a delegate reassigns the property to themselves and
-- WITH CHECK still passes.
revoke update on properties from anon, authenticated;
grant update (title, description, price, city, is_published) on properties to authenticated;

create policy properties_insert_own on properties for insert to authenticated
  with check (agent_id = auth.uid() and get_profile_role() = 'agent');

create policy properties_update on properties for update to authenticated
  using (agent_id = auth.uid() or has_active_mandate(id))
  with check (agent_id = auth.uid() or has_active_mandate(id));

create policy properties_delete_own on properties for delete to authenticated
  using (agent_id = auth.uid());
