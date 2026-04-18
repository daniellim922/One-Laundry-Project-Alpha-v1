import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

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

export function createSupabaseProxyClient(
    request: NextRequest,
    response: NextResponse,
    env: Record<string, string | undefined> = process.env,
) {
    return createServerClient(
        getRequiredEnvVar(SUPABASE_URL_ENV_NAME, env),
        getRequiredEnvVar(SUPABASE_ANON_KEY_ENV_NAME, env),
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, options);
                    });
                },
            },
        },
    );
}
