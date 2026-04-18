## Local Setup

Development uses a **hosted** Supabase project for Auth and Postgres (no local Supabase CLI stack in this repo).

1. Create or open a Supabase project and copy **Project Settings → Database** connection details and **Project Settings → API** (URL + publishable/anon key).
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. In the Supabase Dashboard → **Authentication → URL Configuration**, set the site URL and redirect URLs to match where you run the app (for example `http://localhost:3000` and `http://localhost:3000/auth/callback` during local dev).
4. Build app-ready database state with `npm run db:reset` (wipe, push schema, seed) **against that** `DATABASE_URL`, or run `npm run db:migrate`, `npm run db:seed`, and `npm run db:wipe` individually as needed.
5. In **Authentication → Users**, create a user with email and password if self-service signup is disabled (see `.env.example`).
6. Run the app with `npm run dev`.

`npm run db:reset` wipes, pushes schema, and seeds the database so the deterministic historical payroll dataset is ready for app use and test flows. Seed only writes Postgres data; it does not create Supabase Auth users.

The app, `drizzle-kit push`, wipe, and seed all use **`DATABASE_URL`**.

Runtime sign-in uses Supabase email and password. Typical variables:

```bash
DATABASE_URL=<supabase-postgres-connection-string>
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<supabase-publishable-key>
```

Hosted auth notes:

- Configure providers, signup policy, and redirect URLs in the Supabase Dashboard (not in-repo).
- Email flows (password reset, etc.) use your project’s Auth email settings and templates.

To verify the flow end to end:

1. Run `npm run db:reset` if you need a fresh seeded database.
2. Ensure a user exists in Supabase Auth with a known password (Dashboard or Auth Admin API).
3. Start the app with `npm run dev` and sign in at `/login` with that email and password.
4. Confirm the browser lands on the requested dashboard route and that protected pages are no longer redirecting to `/login`.

## Schema ownership

- `lib/db.ts` is the single database client for app traffic, `drizzle-kit push`, wipe, and seed. `npm run db:migrate` runs `drizzle-kit push` via `drizzle.config.ts`.
- Drizzle (`db/schema.ts`) is the schema source of truth.
- The production rollout contract lives in `.codex/docs/supabase-rollout-contract.md`.

## Worker Test Commands

```bash
npm run test:unit:worker
npm run test:e2e:worker
```

`test:e2e:worker` is deterministic and assumes seeded data/users are present. Run `npm run db:reset` first.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Payroll overlap diagnostics

The payroll table enforces no overlapping payroll periods for the same worker.
If inserting or updating payroll rows fails with an exclusion constraint violation on overlapping periods, run:

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
