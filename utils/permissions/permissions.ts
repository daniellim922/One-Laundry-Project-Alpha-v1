import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { featuresTable } from "@/db/tables/auth/featuresTable";
import { rolePermissionsTable } from "@/db/tables/auth/rolePermissionsTable";
import { userRolesTable } from "@/db/tables/auth/userRolesTable";

export type PermissionAction = "create" | "read" | "update" | "delete";

/**
 * Check if a user has permission to perform an action on a feature.
 * Returns true if any of the user's roles grant the requested action.
 */
export async function checkPermission(
    userId: string,
    featureName: string,
    action: PermissionAction,
): Promise<boolean> {
    const actionColumn =
        action === "create"
            ? rolePermissionsTable.create
            : action === "read"
              ? rolePermissionsTable.read
              : action === "update"
                ? rolePermissionsTable.update
                : rolePermissionsTable.delete;

    const result = await db
        .select({ id: rolePermissionsTable.id })
        .from(userRolesTable)
        .innerJoin(
            rolePermissionsTable,
            eq(userRolesTable.roleId, rolePermissionsTable.roleId),
        )
        .innerJoin(
            featuresTable,
            eq(rolePermissionsTable.featureId, featuresTable.id),
        )
        .where(
            and(
                eq(userRolesTable.userId, userId),
                eq(featuresTable.name, featureName),
                eq(actionColumn, true),
            ),
        )
        .limit(1);

    return result.length > 0;
}
