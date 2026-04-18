import {
    requireAdminUser,
    type AuthenticatedUserLike,
} from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { apiError } from "./responses";

type ApiAdminUser = {
    email: string;
};

type ApiAuthClientLike = {
    auth: {
        getUser: () => Promise<{
            data: {
                user: AuthenticatedUserLike | null;
            };
            error: unknown;
        }>;
    };
};

function unauthorizedResponse() {
    return apiError({
        status: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
    });
}

export function requireApiAdminUser(
    user: AuthenticatedUserLike | null | undefined,
): ApiAdminUser | Response {
    if (!user?.email) {
        return unauthorizedResponse();
    }

    try {
        return {
            email: requireAdminUser(user).email,
        };
    } catch {
        return unauthorizedResponse();
    }
}

export async function requireCurrentApiAdminUser(
    client?: ApiAuthClientLike,
): Promise<ApiAdminUser | Response> {
    const supabase = client ?? (await createSupabaseServerClient());
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error) {
        return unauthorizedResponse();
    }

    return requireApiAdminUser(user);
}
