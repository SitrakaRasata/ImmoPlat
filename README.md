# immo-grant

A property listing platform whose subject is **declarative authorization**: every access
rule lives in the Postgres schema, none of it is reimplemented in the application.

The interesting case is not "I can see what I own" — that is the textbook example and it
proves nothing. It is **delegation**: an agent may be granted a mandate on a listing they do
not own, and that mandate expires on its own, without any row changing.

## The authorization matrix

Every cell below is one named test. Read each row against a listing owned by the *owning
agent*; for `INSERT` the question is whether that identity may create a listing attributed
to that agent.

|                       | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| anonymous, published  | yes | — | — | — |
| anonymous, draft      | —   | — | — | — |
| client                | yes | — | — | — |
| owning agent          | yes | yes | yes | yes |
| mandated agent        | yes | — | yes | — |
| unrelated agent       | —   | — | — | — |

`tests/policies/matrix.test.ts` — run it with `pnpm test`. No container, no external
service, no server to start: the suite applies `supabase/schema.sql` verbatim inside an
in-process PostgreSQL 18.3 (PGlite).

## Three traps this schema walks into on purpose

**Policy recursion.** The policy on `properties` needs to know whether the reader holds a
mandate, so it reads `property_mandates`. The policy on `property_mandates` needs to know
whether the reader owns the listing, so it reads `properties`. Written naively the two call
each other and Postgres raises `42P17 infinite recursion detected in policy`. The way out is
a `SECURITY DEFINER` function, which reads outside RLS.

**`SECURITY DEFINER` discipline.** Such a function is an RLS bypass, so it takes no caller
supplied identity — it reads `auth.uid()` itself — returns a boolean rather than rows, pins
its `search_path`, and has its execute privilege revoked from `public` before being granted
by name.

**`GRANT` is not RLS.** A mandated agent may edit a listing but must not reassign it. RLS
cannot express that: `WITH CHECK` only sees the row as it will be, never as it was. The
answer is a column privilege — `agent_id` is never granted for update to anyone. **RLS
decides which rows, `GRANT` decides which columns and which operations.**

## The service-role boundary

`scripts/seed.py` is the only code path that bypasses row level security, and it is the one
case that justifies it: no user exists yet, so there is no JWT to act under. It runs
offline, never in response to an incoming request, and its key never reaches a browser.

To run it against a fresh Supabase project: apply `supabase/schema.sql` through the
dashboard's SQL editor, then fill in `.env` (see `.env.example` for the shape) and run
`pip install -r scripts/requirements.txt && python scripts/seed.py`.

## What is not tested, and why

- The test harness recreates PostgREST's documented contract — `role` plus the
  `request.jwt.claims` GUC — but does not prove that Supabase sets them at runtime. The
  single Playwright test in `e2e/` covers that against a live project.
- GoTrue, token signing and password hashing are not tested at all. That is Supabase's code,
  not this project's.
- PGlite is a single-connection WebAssembly build. Nothing in the matrix exercises
  concurrency, but it is a difference from production and it is stated rather than hidden.

## Running it

```bash
pnpm install
pnpm test                  # the policy matrix, no external service needed
pnpm run dev
pnpm test:e2e              # the SSR leg, only with a configured Supabase project
```

`pnpm test` always runs the full matrix above against in-process PGlite, so the green it
reports is complete on its own terms. The end-to-end test in `e2e/` and the seeder in
`scripts/` are the only two things that talk to a real Supabase project, and both report a
skip rather than a failure when `.env` is not filled in — a skip that names what is missing,
so it is never mistaken for a check that passed.

`.env.example` lists every variable, including the three that only the seeder and the
end-to-end test read.
