import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
    SUPABASE_ANON_KEY_ENV_NAME,
    SUPABASE_URL_ENV_NAME,
} from "@/lib/supabase/client";

function getRequiredEnvVar(name: string, env: Record<string, string | undefined>) {
    const value = env[name];

    if (!value?.trim()) {
        throw new Error(`${name} is not set in the environment variables`);
    }

    return value;
}

export async function createSupabaseServerClient(
    env: Record<string, string | undefined> = process.env,
) {
    const cookieStore = await cookies();

    return createServerClient(
        getRequiredEnvVar(SUPABASE_URL_ENV_NAME, env),
        getRequiredEnvVar(SUPABASE_ANON_KEY_ENV_NAME, env),
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore.set(name, value, options);
                    });
                },
            },
        },
    );
}
