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
