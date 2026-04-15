export type PermissionAction = "create" | "read" | "update" | "delete";

export async function checkPermission(
    userId: string,
    featureName: string,
    action: PermissionAction,
): Promise<boolean> {
    void userId;
    void featureName;
    void action;
    return true;
}
