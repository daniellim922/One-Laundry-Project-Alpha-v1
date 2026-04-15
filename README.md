## Local Setup

The default local database platform is Supabase local.

1. Copy `.env.example` to `.env`.
2. Start the local database stack with `npm run supabase:start`.
3. Check the local service endpoints with `npm run supabase:status`.
4. Build the app-ready local database state with `npm run supabase:db:reset`.
5. Run schema/admin workflows individually with `npm run supabase:db:generate`, `npm run supabase:db:migrate`, `npm run supabase:db:seed`, or `npm run supabase:db:wipe`.
6. Open the primary local database UI with `npm run supabase:studio`.
7. Run the app with `npm run dev`.

`npm run supabase:db:reset` is the end-to-end local Supabase workflow. It will reset, migrate, and seed the database so the deterministic historical payroll dataset is ready for app use and test flows.

Legacy `db:*` scripts remain as compatibility aliases, but the Supabase-first `supabase:*` commands are the default path for local development.

The app runtime reads `DATABASE_RUNTIME_URL` first and falls back to `DATABASE_URL`.
Schema and migration tooling read `DATABASE_ADMIN_URL` first and fall back to `DATABASE_URL`.
For local Supabase all three can point at:

```bash
postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

For hosted Supabase, keep the responsibilities split:

- `DATABASE_RUNTIME_URL`: app traffic, typically the pooled/session connection path.
- `DATABASE_ADMIN_URL`: Drizzle migrations, schema management, Drizzle Studio, wipe/reset, and seeding against the direct admin-capable connection path.

## Migration ownership

- `lib/db.ts` owns the runtime database boundary for app traffic.
- `lib/admin-db.ts` owns migration, schema-management, wipe/reset, and seed workflows.
- Drizzle is the schema source of truth; Supabase CLI manages local platform lifecycle only.
- The production rollout contract lives in `.codex/docs/supabase-rollout-contract.md`.

Supabase Studio is available at `http://127.0.0.1:54323` after the stack starts, and `npm run supabase:studio` opens that URL when possible.

Stop the local stack with:

```bash
npm run supabase:stop
```

## Worker Test Commands

```bash
npm run test:worker
npm run test:e2e:worker
```

`test:e2e:worker` is deterministic and assumes seeded data/users are present. Run `npm run supabase:db:reset` first.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Payroll Overlap Migration Diagnostics

The payroll table enforces no overlapping payroll periods for the same worker.
If migration `0017_payroll_worker_period_overlap_exclusion.sql` fails, run:

```sql
SELECT
  p1.id AS payroll_id_1,
  p2.id AS payroll_id_2,
  w.name AS worker_name,
  p1.period_start AS payroll_1_start,
  p1.period_end AS payroll_1_end,
  p2.period_start AS payroll_2_start,
  p2.period_end AS payroll_2_end,
  p1.status AS payroll_1_status,
  p2.status AS payroll_2_status
FROM payroll p1
JOIN payroll p2
  ON p1.worker_id = p2.worker_id
 AND p1.id < p2.id
 AND daterange(p1.period_start, p1.period_end, '[]')
     && daterange(p2.period_start, p2.period_end, '[]')
JOIN worker w ON w.id = p1.worker_id
ORDER BY w.name, p1.period_start, p2.period_start;
```

Manual cleanup default: keep `Settled` payroll records over `Draft` when resolving overlaps, unless finance confirms the settled row is incorrect.
