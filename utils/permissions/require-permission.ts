import { type PermissionAction } from "./permissions";

const OPEN_ACCESS_USER_ID = "open-access";

export async function requirePermission(
    featureName: string,
    action: PermissionAction,
): Promise<{ userId: string }> {
    void featureName;
    void action;
    return { userId: OPEN_ACCESS_USER_ID };
}
