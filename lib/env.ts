/**
 * Validated app env (`env`) — import this instead of reading `process.env` directly.
 *
 * **Defaults:** When `NODE_ENV` is not `production`, local Supabase CLI / Postgres defaults are used
 * (same values as `.env.development`). No secrets are required in the repo for day-to-day dev.
 *
 * **Production:** When `NODE_ENV === "production"` (typically `next build` / `next start` on a host
 * that sets it), `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
 * must be set in the environment (Vercel, root `.env`, etc.).
 *
 * **Node / CLI:** loads the repo-root `.env` into `process.env` before branching (skipped in the
 * browser and on Next.js Edge). Existing keys are not overwritten (shell exports win).
 *
 * **Next.js:** `next dev` / `next build` inject layered `.env*` per framework rules; this module
 * does not reimplement that cascade for production values.
 */
import { z } from "zod";

const credentialsSchema = z.object({
    DATABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

const DEVELOPMENT_ENV_DEFAULTS = {
    DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:54322",
    NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
} as const;

const PRODUCTION_ENV = {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
} as const;

const nodeEnv = z
    .enum(["development", "production", "test"])
    .default("development")
    .parse(process.env.NODE_ENV);

const parsed =
    nodeEnv === "production"
        ? credentialsSchema.safeParse(PRODUCTION_ENV)
        : credentialsSchema.safeParse(DEVELOPMENT_ENV_DEFAULTS);

if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.format());
    throw new Error("Invalid environment variables");
}

/** Validated connection + public Supabase settings (import from here, not `process.env`). */
export const env = {
    DATABASE_URL: parsed.data.DATABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: parsed.data.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        parsed.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
} as const;
