create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;

create table auth.users (
  id                 uuid primary key,
  email              text unique,
  raw_user_meta_data jsonb not null default '{}'
);

-- The double nullif is necessary: without claims, current_setting returns the
-- empty string, which ::json rejects as 22P02, failing every anonymous request.
create function auth.uid() returns uuid language sql stable as $$
  select nullif(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'sub', '')::uuid
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- Reproduces the Supabase platform bootstrap, not a project choice: on real
-- Supabase these three statements run at provisioning, before any table
-- exists. In production RLS is the only barrier on public tables, so the
-- harness must grant the same table privileges or a missing policy would
-- pass a test for the wrong reason (permission denied instead of RLS denial).
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
