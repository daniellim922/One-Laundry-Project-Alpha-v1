/**
 * Validated **server-side** app env (`env`) — import this instead of reading `process.env` directly
 * for code that runs on the server (DB, SSR Supabase, CLI via Drizzle, Vitest in Node).
 *
 * **Public Supabase settings** are validated separately in `lib/env-public.ts` so client bundles
 * never require `DATABASE_URL`.
 *
 * **Defaults:** When `NODE_ENV` is not `production`, a local Postgres URL default is used unless
 * `DATABASE_URL` is set (same host/port as Supabase CLI Postgres).
 *
 * **Production:** `DATABASE_URL` must be set in the environment (Vercel, root `.env`, etc.).
 * Public vars still come from `env-public` (required in production there too).
 *
 * **Next.js:** `next dev` / `next build` inject layered `.env*` per framework rules.
 *
 * Client code must use `@/lib/env-public`, not this module — `DATABASE_URL` is not available in the browser.
 */
import { z } from "zod";

import { envPublic, resolvedNodeEnv } from "@/lib/env-public";

const databaseUrlCandidate =
    resolvedNodeEnv === "production"
        ? process.env.DATABASE_URL
        : "postgresql://postgres:postgres@127.0.0.1:54322";

const databaseParsed = z.url().safeParse(databaseUrlCandidate);

if (!databaseParsed.success) {
    console.error("Invalid DATABASE_URL:", databaseParsed.error.message);
    console.error("Issues:", databaseParsed.error.issues);
    throw new Error("Invalid DATABASE_URL");
}

/** Validated connection string plus public Supabase settings from `env-public`. */
export const env = {
    DATABASE_URL: databaseParsed.data,
    NEXT_PUBLIC_SUPABASE_URL: envPublic.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        envPublic.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
} as const;
