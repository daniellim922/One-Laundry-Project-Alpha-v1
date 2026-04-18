# Supabase Production Rollout Contract

Status: Draft until human review is recorded on Issue #63.

This contract defines how One Laundry uses a hosted Supabase database and Auth with Drizzle-owned schema, without a committed SQL migration chain in git.

## Scope

- Supabase is the database platform for development and production.
- Drizzle (`db/schema.ts`) remains the source of truth for the relational schema; the database is synchronized with **`drizzle-kit push`** (no committed SQL migration chain in git).
- The Next.js app stays separately hosted; this contract only covers the database rollout boundary.
- Live data migration is out of scope for this refactor and must be planned separately before any cutover.

## Environment Contract

- `DATABASE_URL` is the single connection string for the Next.js app, `drizzle-kit push`, wipe, and seed (`lib/db.ts` and `drizzle.config.ts`). Use the hosted project’s Postgres URI from Supabase (direct or pooler, per your environment).
- Runtime auth requires `NEXT_PUBLIC_SUPABASE_URL` and the Supabase publishable (anon) key for the browser and server clients.
- Create sign-in users in Supabase Studio or via the Auth Admin API when self-service signup is disabled; `SUPABASE_SERVICE_ROLE_KEY` is for server-side tooling and Auth Admin API calls, not for end-user sign-in.

## Schema ownership

- `lib/db.ts` owns database access for app reads and writes, schema push, wipe, reset, and seed.
- `npm run db:migrate` runs `drizzle-kit push` using `drizzle.config.ts` and `DATABASE_URL`.
- **Production risk:** `drizzle-kit push` applies diffs directly and can drop or alter columns without a reviewed SQL migration file. Treat production pushes like destructive DDL: review `db/schema.ts` changes, back up first, and run smoke checks after.

## Launch Prerequisites

- Hosted Supabase project exists with a production `DATABASE_URL` prepared for the app and tooling.
- Auth environment variables are prepared for the deployed app, and operators know how to create or invite dashboard users in the hosted Supabase project when signup is disabled.
- `db/schema.ts` on the release branch is reviewed for intended DDL impact (including data loss) before push.
- Verification has passed on the current branch with `npm run test` and any feature checks required by the release.
- Seed policy is explicit: deterministic seed data is for local and test environments only, not for production.
- Operators know the non-production reset workflow (`npm run db:reset` against a safe database), who approves production schema changes, and the smoke-check path after push.

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
- Sign in at `/login` with a configured user email and password, then confirm the browser returns to the requested dashboard route when redirected from a protected URL.
- Confirm one protected `/api/*` request returns `401` before sign-in and succeeds after an authenticated session is established.
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
