# Supabase Production Rollout Contract

Status: Draft until human review is recorded on Issue #63.

This contract defines how One Laundry moves from the local Supabase-first workflow to a hosted Supabase production database without changing Drizzle ownership of schema and migrations.

## Scope

- Supabase is the database platform for local development and hosted production.
- Drizzle remains the source of truth for schema and migrations.
- The Next.js app stays separately hosted; this contract only covers the database rollout boundary.
- Live data migration is out of scope for this refactor and must be planned separately before any cutover.

## Environment Contract

- `DATABASE_RUNTIME_URL` is the application runtime connection and should point at the runtime-safe Supabase connection path.
- `DATABASE_ADMIN_URL` is the admin and schema-management connection and should point at the direct admin-capable Supabase connection path.
- `DATABASE_URL` remains a legacy fallback only and should not be the primary production contract once the rollout is prepared.
- Local Supabase may set all three variables to `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.

## Migration Ownership

- `lib/db.ts` owns runtime database access for app reads and writes.
- `lib/admin-db.ts` owns schema-management, migration, wipe, reset, and seed access.
- `npm run supabase:db:generate` is the only repo-supported path for generating new Drizzle migrations.
- `npm run supabase:db:migrate` is the repo-supported path for applying committed Drizzle migrations.
- Supabase CLI manages the local platform lifecycle, not schema authorship.
- Production schema changes must run from committed Drizzle migrations before any app deployment that depends on them.

## Launch Prerequisites

- Hosted Supabase project exists with production connection values prepared for both runtime and admin roles.
- The committed Drizzle migration chain is clean, reviewed, and ready to run in order.
- Local verification has passed on the current branch with `npm run test:db:contracts` and any feature checks required by the release.
- Seed policy is explicit: deterministic seed data is for local and test environments only, not for production.
- Operators know the local reset workflow, the production migration owner, and the smoke-check path after migration.

## Execution Order

1. Confirm the hosted Supabase project is reachable through both `DATABASE_RUNTIME_URL` and `DATABASE_ADMIN_URL`.
2. Back up the target database according to the hosting environment policy before applying schema changes.
3. Apply committed Drizzle migrations through the admin connection with `npm run supabase:db:migrate`.
4. Do not run `npm run supabase:db:seed` against production.
5. Deploy or restart the application only after migrations finish successfully.
6. Run the smoke checks below before treating the release as healthy.

## Smoke Checks

- Open the landing page, login page, and direct `/dashboard` route successfully.
- Load workers, timesheets, payroll, advances, and expenses screens without database connection errors.
- Create or update one low-risk record in a non-production-like validation environment before repeating in production if write verification is required.
- Generate one payroll PDF or advance PDF to confirm the app runtime can read the production dataset.
- Confirm recent payroll rows, timesheet rows, and worker rows appear in the dashboard as expected after the release.

## Rollback Expectations

- If a migration fails before application deploy, stop and restore database access from backup or platform recovery procedures before retrying.
- If the app deploy succeeds but smoke checks fail, prefer rolling the application back first when the schema remains backward-compatible.
- If a schema change is not backward-compatible, rollback requires an explicit database recovery decision; do not improvise ad hoc reverse SQL in production.
- Record the failed migration tag, observed error, and recovery action before the next rollout attempt.

## Human Review

- Issue #63 stays open until a human reviewer confirms this document is acceptable for launch planning.
- Until that review happens, this contract is implementation guidance only and is not launch-ready policy.
