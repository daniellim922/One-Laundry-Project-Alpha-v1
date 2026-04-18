import { createBrowserClient } from "@supabase/ssr";

export const SUPABASE_URL_ENV_NAME = "NEXT_PUBLIC_SUPABASE_URL";
export const SUPABASE_ANON_KEY_ENV_NAME = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

function getRequiredEnvVar(name: string, env: Record<string, string | undefined>) {
    const value = env[name];

    if (!value?.trim()) {
        throw new Error(`${name} is not set in the environment variables`);
    }

    return value;
}

export function createSupabaseBrowserClient(
    env: Record<string, string | undefined> = process.env,
) {
    if (!browserClient) {
        browserClient = createBrowserClient(
            getRequiredEnvVar(SUPABASE_URL_ENV_NAME, env),
            getRequiredEnvVar(SUPABASE_ANON_KEY_ENV_NAME, env),
        );
    }

    return browserClient;
}
