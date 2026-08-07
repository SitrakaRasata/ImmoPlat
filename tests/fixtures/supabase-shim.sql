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
