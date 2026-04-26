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
Destructive DB integration tests do not use the normal app `DATABASE_URL`; run
them only with `npm run test:db:destructive` and set
`ONE_LAUNDRY_DESTRUCTIVE_TEST_DATABASE_URL` to a dedicated test database.

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

## Destructive DB Tests

Routine verification through `npm run test` and `npm run test:unit` excludes DB
tests that call `wipeDb`, `TRUNCATE`, schema reset, or destructive seed setup.
Run those tests only against a disposable database:

```bash
ONE_LAUNDRY_ALLOW_DESTRUCTIVE_DB=true \
ONE_LAUNDRY_DESTRUCTIVE_DB_ACTION=test \
ONE_LAUNDRY_DESTRUCTIVE_TEST_DATABASE_URL=<dedicated-test-database-url> \
npm run test:db:destructive
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
