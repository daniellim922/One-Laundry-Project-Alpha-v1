/**
 * Validated app env (`env`) — import this instead of reading `process.env` directly.
 *
 * **Node / CLI:** loads `.env*` in dotenv-flow order before Zod runs (skipped in the browser and
 * on Next.js Edge so `fs` is never touched there). Cascade (low → high priority):
 * `.env.defaults` → `.env` → `.env.local` → `.env.${NODE_ENV}` → `.env.${NODE_ENV}.local`
 * (`.env.local` omitted when `NODE_ENV=test`). When `NODE_ENV` is unset,
 * `default_node_env: "development"` applies.
 *
 * **Next.js:** build/runtime already defines `process.env` for server and `NEXT_PUBLIC_*` for the
 * client; dotenv-flow only fills gaps (e.g. `drizzle-kit`, `tsx` scripts) and does not override
 * existing keys.
 */
import { config as loadDotenvFlow } from "dotenv-flow";
import { z } from "zod";

if (typeof window === "undefined" && process.env.NEXT_RUNTIME !== "edge") {
    loadDotenvFlow({ default_node_env: "development" });
}

const envSchema = z.object({
    NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),

    DATABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.format());
    throw new Error("Invalid environment variables");
}

const data = parsed.data;

/** Validated environment + derived flags (import from here, not `process.env`). */
export const env = {
    ...data,
    isDevelopment: data.NODE_ENV === "development",
    isProduction: data.NODE_ENV === "production",
    isTest: data.NODE_ENV === "test",
} as const;

export type Env = typeof env;
