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
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, firstname, lastname)
  values (new.id,
          new.raw_user_meta_data ->> 'firstname',
          new.raw_user_meta_data ->> 'lastname');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create function get_profile_role() returns profile_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;
revoke execute on function get_profile_role() from public;
grant execute on function get_profile_role() to authenticated;
