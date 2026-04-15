import { type PermissionAction } from "@/utils/permissions/permissions";

type RequestLike = {
    headers: Headers;
};

const OPEN_ACCESS_USER_ID = "open-access";

export async function getApiSession(request: RequestLike) {
    void request;
    return null;
}

export async function requireApiPermission(
    request: RequestLike,
    featureName: string,
    action: PermissionAction,
) {
    void request;
    void featureName;
    void action;
    return {
        session: null,
        userId: OPEN_ACCESS_USER_ID,
    };
}
