import { createClient } from "@/lib/supabase/server";

import { apiError } from "./responses";

export type AuthenticatedUserLike = {
    email?: string | null;
};

export type ApiSessionUser = {
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

function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

function unauthorizedResponse() {
    return apiError({
        status: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
    });
}

export function requireApiUser(
    user: AuthenticatedUserLike | null | undefined,
): ApiSessionUser | Response {
    if (!user?.email?.trim()) {
        return unauthorizedResponse();
    }

    return {
        email: normalizeEmail(user.email),
    };
}

export async function requireCurrentApiUser(
    client?: ApiAuthClientLike,
): Promise<ApiSessionUser | Response> {
    const supabase = client ?? (await createClient());
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error) {
        return unauthorizedResponse();
    }

    return requireApiUser(user);
}
