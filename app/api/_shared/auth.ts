import { auth } from "@/lib/auth";
import {
    checkPermission,
    type PermissionAction,
} from "@/utils/permissions/permissions";
import { apiError } from "./responses";

type RequestLike = {
    headers: Headers;
};

export async function getApiSession(request: RequestLike) {
    return auth.api.getSession({ headers: request.headers });
}

export async function requireApiPermission(
    request: RequestLike,
    featureName: string,
    action: PermissionAction,
) {
    const session = await getApiSession(request);
    if (!session) {
        return apiError({
            status: 401,
            code: "UNAUTHORIZED",
            message: "Authentication required",
        });
    }

    const allowed = await checkPermission(session.user.id, featureName, action);
    if (!allowed) {
        return apiError({
            status: 403,
            code: "FORBIDDEN",
            message: "Forbidden",
        });
    }

    return {
        session,
        userId: session.user.id,
    };
}
