import {
    requireAdminUser,
    type AuthenticatedUserLike,
} from "@/lib/auth/admin";

import { apiError } from "./responses";

export function requireApiAdminUser(
    user: AuthenticatedUserLike | null | undefined,
) {
    if (!user?.email) {
        return apiError({
            status: 401,
            code: "UNAUTHORIZED",
            message: "Authentication required",
        });
    }

    try {
        return {
            email: requireAdminUser(user).email,
        };
    } catch {
        return apiError({
            status: 403,
            code: "FORBIDDEN",
            message: "Forbidden",
        });
    }
}
