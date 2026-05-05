/**
 * Browser-safe validated Supabase **public** env (`NEXT_PUBLIC_*` only).
 *
 * Non-production builds merge local Supabase CLI defaults with any defined
 * `process.env` overrides so `next dev` works without a filled `.env.local`.
 */
import { z } from "zod";

const publicCredentialsSchema = z.object({
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

const PUBLIC_DEVELOPMENT_DEFAULTS = {
    NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
} as const;

const publicProcessEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
} as const;

export const resolvedNodeEnv = z
    .enum(["development", "production", "test"])
    .default("development")
    .parse(process.env.NODE_ENV);

function mergeDevPublicCredentials(): z.infer<typeof publicCredentialsSchema> {
    return {
        ...PUBLIC_DEVELOPMENT_DEFAULTS,
        ...(publicProcessEnv.NEXT_PUBLIC_SUPABASE_URL
            ? {
                  NEXT_PUBLIC_SUPABASE_URL:
                      publicProcessEnv.NEXT_PUBLIC_SUPABASE_URL,
              }
            : {}),
        ...(publicProcessEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
            ? {
                  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
                      publicProcessEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
              }
            : {}),
    };
}

const publicEnvInput =
    resolvedNodeEnv === "production"
        ? publicProcessEnv
        : mergeDevPublicCredentials();

const publicParsed = publicCredentialsSchema.safeParse(publicEnvInput);

if (!publicParsed.success) {
    console.error(
        "Invalid public environment variables:",
        publicParsed.error.message,
    );
    console.error("Issues:", publicParsed.error.issues);
    throw new Error("Invalid public environment variables");
}

/** Validated public Supabase URL + anon/publishable key (safe for client bundles). */
export const envPublic = publicParsed.data;
