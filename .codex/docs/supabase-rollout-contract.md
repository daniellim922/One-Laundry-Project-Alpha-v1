# Supabase Production Rollout Contract

Status: Draft until human review is recorded on Issue #63.

This contract defines how One Laundry moves from the local Supabase-first workflow to a hosted Supabase production database without changing Drizzle ownership of the schema.

## Scope

- Supabase is the database platform for local development and hosted production.
- Drizzle (`db/schema.ts`) remains the source of truth for the relational schema; the database is synchronized with **`drizzle-kit push`** (no committed SQL migration chain in git).
- The Next.js app stays separately hosted; this contract only covers the database rollout boundary.
- Live data migration is out of scope for this refactor and must be planned separately before any cutover.

## Environment Contract

- `DATABASE_URL` is the single connection string for the Next.js app, `drizzle-kit push`, wipe, and seed (`lib/db.ts` and `drizzle.config.ts`).
- Local Supabase may set it to `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.
- Runtime auth requires `AUTH_ADMIN_EMAIL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Admin bootstrap additionally requires `SUPABASE_SERVICE_ROLE_KEY` so `npm run auth:bootstrap-admin` can create or repair the single allowed auth user before sign-in testing.

## Schema ownership

- `lib/db.ts` owns database access for app reads and writes, schema push, wipe, reset, and seed.
- `npm run db:migrate` runs `drizzle-kit push` using `drizzle.config.ts` and `DATABASE_URL`.
- Supabase CLI manages the local platform lifecycle, not schema authorship.
- **Production risk:** `drizzle-kit push` applies diffs directly and can drop or alter columns without a reviewed SQL migration file. Treat production pushes like destructive DDL: review `db/schema.ts` changes, back up first, and run smoke checks after.

## Launch Prerequisites

- Hosted Supabase project exists with a production `DATABASE_URL` prepared for the app and tooling.
- Auth environment variables are prepared for the deployed app, and the release operator has access to run `npm run auth:bootstrap-admin` with the production values when needed.
- `db/schema.ts` on the release branch is reviewed for intended DDL impact (including data loss) before push.
- Local verification has passed on the current branch with `npm run test` and any feature checks required by the release.
- Seed policy is explicit: deterministic seed data is for local and test environments only, not for production.
- Operators know the local reset workflow, who approves production schema changes, and the smoke-check path after push.

## Execution Order

1. Confirm the hosted Supabase project is reachable with `DATABASE_URL`.
2. Back up the target database according to the hosting environment policy before applying schema changes.
3. Apply the schema with `npm run db:migrate` (drizzle-kit push).
4. Do not run `npm run db:seed` against production.
5. Deploy or restart the application only after the schema push finishes successfully.
6. Run the smoke checks below before treating the release as healthy.

## Smoke Checks

- Open the landing page and `/login`, then confirm an unauthenticated request to `/dashboard` redirects back to `/login`.
- Load workers, timesheets, payroll, advances, and expenses screens without database connection errors.
- Request a magic link for `AUTH_ADMIN_EMAIL`, complete `/auth/callback`, and confirm the browser returns to the requested dashboard route.
- Confirm one protected `/api/*` request returns `401` before sign-in and succeeds after the admin session is established.
- Create or update one low-risk record in a non-production-like validation environment before repeating in production if write verification is required.
- Generate one payroll PDF or advance PDF to confirm the app runtime can read the production dataset.
- Confirm recent payroll rows, timesheet rows, and worker rows appear in the dashboard as expected after the release.

## Rollback Expectations

- If a schema push fails before application deploy, stop and restore database access from backup or platform recovery procedures before retrying.
- If the app deploy succeeds but smoke checks fail, prefer rolling the application back first when the schema remains backward-compatible.
- If a schema change is not backward-compatible, rollback requires an explicit database recovery decision; do not improvise ad hoc reverse SQL in production.
- Record the failed operation, observed error, and recovery action before the next rollout attempt.

## Human Review

- Issue #63 stays open until a human reviewer confirms this document is acceptable for launch planning.
- Until that review happens, this contract is implementation guidance only and is not launch-ready policy.
