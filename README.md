## Local Setup

Development uses a **hosted** Supabase project for Auth and Postgres (no local Supabase CLI stack in this repo).

1. Create or open a Supabase project and copy **Project Settings → Database** connection details and **Project Settings → API** (URL + publishable/anon key).
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. In the Supabase Dashboard → **Authentication → URL Configuration**, set the site URL and redirect URLs to match where you run the app (for example `http://localhost:3000` and `http://localhost:3000/auth/callback` during local dev).
4. Build app-ready database state with `npm run db:reset` (wipe, push schema, seed) **against that** `DATABASE_URL`, or run `npm run db:migrate`, `npm run db:seed`, and `npm run db:wipe` individually as needed.
5. In **Authentication → Users**, create a user with email and password if self-service signup is disabled (see `.env.example`).
6. Run the app with `npm run dev`.

`npm run db:reset` wipes, pushes schema, and seeds the database so the deterministic historical payroll dataset is ready for app use and test flows. Seed only writes Postgres data; it does not create Supabase Auth users.

The app, `drizzle-kit push`, wipe, seed, and Vitest integration tests that hit Postgres all use **`DATABASE_URL`**.

## Dependency and supply-chain security

- Use `npm ci` for deploys and CI so installs are locked to `package-lock.json`.
- Use `npm install` only when intentionally updating dependencies, then commit both `package.json` and `package-lock.json`.
- Run `npm run security:audit` before shipping dependency changes. It runs `npm audit --audit-level=moderate` and checks for known TanStack May 2026 supply-chain indicators.
- Do not add a strict Content Security Policy directly in production. Roll CSP out separately in report-only mode first because the App Router, auth redirects, and PDF workflows need compatibility testing.

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
- Public application tables declare `.enableRLS()` in `db/tables/` so Supabase Row Level Security stays enabled after Drizzle migrations. The app does not use Supabase table APIs for application data; server-side Drizzle access goes through `DATABASE_URL`.
