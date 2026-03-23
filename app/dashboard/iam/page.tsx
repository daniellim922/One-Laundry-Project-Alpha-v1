import Link from "next/link";
import { eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { user } from "@/db/auth-schema";
import { rolesTable } from "@/db/tables/auth/rolesTable";
import { userRolesTable } from "@/db/tables/auth/userRolesTable";
import { rolePermissionsTable } from "@/db/tables/auth/rolePermissionsTable";
import { featuresTable } from "@/db/tables/auth/featuresTable";
import { type IAMUserRow } from "./columns";
import {
    RolePermissionsCard,
    type RolePermission,
} from "./role-permissions-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function Page() {
    const [users, userRoleLinks, roles, rolePermissionsRows] =
        await Promise.all([
            db.select().from(user).orderBy(user.createdAt),
            db
                .select({
                    userId: userRolesTable.userId,
                    roleId: userRolesTable.roleId,
                    roleName: rolesTable.name,
                })
                .from(userRolesTable)
                .innerJoin(
                    rolesTable,
                    eq(userRolesTable.roleId, rolesTable.id),
                ),
            db.select().from(rolesTable),
            db
                .select({
                    roleId: rolePermissionsTable.roleId,
                    roleName: rolesTable.name,
                    featureName: featuresTable.name,
                    create: rolePermissionsTable.create,
                    read: rolePermissionsTable.read,
                    update: rolePermissionsTable.update,
                    delete: rolePermissionsTable.delete,
                })
                .from(rolePermissionsTable)
                .innerJoin(
                    rolesTable,
                    eq(rolePermissionsTable.roleId, rolesTable.id),
                )
                .innerJoin(
                    featuresTable,
                    eq(rolePermissionsTable.featureId, featuresTable.id),
                ),
        ]);

    const roleMap = new Map<string, string[]>();
    const usersByRoleId = new Map<string, IAMUserRow[]>();
    for (const link of userRoleLinks) {
        const arr = roleMap.get(link.userId) ?? [];
        arr.push(link.roleName);
        roleMap.set(link.userId, arr);
    }

    const allUserRows: IAMUserRow[] = users.map((u) => {
        const roles = roleMap.get(u.id) ?? [];
        return {
            id: u.id,
            name: u.name,
            email: u.email,
            username: u.username,
            banned: u.banned,
            roles,
            rolesDisplay: roles.join(", "),
            createdAt: u.createdAt,
        };
    });

    for (const link of userRoleLinks) {
        if (link.roleId == null) continue;
        const userRow = allUserRows.find((r) => r.id === link.userId);
        if (userRow) {
            const arr = usersByRoleId.get(link.roleId) ?? [];
            arr.push(userRow);
            usersByRoleId.set(link.roleId, arr);
        }
    }

    const permissionsByRole = new Map<string, RolePermission[]>();
    for (const row of rolePermissionsRows) {
        if (row.roleId == null) continue;
        const perm: RolePermission = {
            featureName: row.featureName,
            create: row.create,
            read: row.read,
            update: row.update,
            delete: row.delete,
        };
        const arr = permissionsByRole.get(row.roleId) ?? [];
        arr.push(perm);
        permissionsByRole.set(row.roleId, arr);
    }

    const rolesWithPermissions = roles.map((r) => ({
        roleId: r.id,
        roleName: r.name,
        permissions: permissionsByRole.get(r.id) ?? [],
        users: usersByRoleId.get(r.id) ?? [],
    }));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    Identity and Access Management
                </h1>
                <p className="text-muted-foreground">
                    Manage users, roles, and permissions.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Users
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{users.length}</div>
                        <p className="text-muted-foreground text-xs">
                            Registered users
                        </p>
                        <Button variant="link" className="h-auto p-0" asChild>
                            <Link href="/dashboard/iam/users/new">
                                Add user
                                <Plus className="ml-1 h-3 w-3" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Roles
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{roles.length}</div>
                        <p className="text-muted-foreground text-xs">
                            Defined roles
                        </p>
                        <Button variant="link" className="h-auto p-0" asChild>
                            <Link href="/dashboard/iam/roles/new">
                                Add role
                                <Plus className="ml-1 h-3 w-3" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                    <h2 className="text-xl font-semibold tracking-tight">
                        Roles & Permissions
                    </h2>
                    <Button asChild>
                        <Link href="/dashboard/iam/roles/new">
                            <Plus className="mr-2 h-4 w-4" />
                            Add role
                        </Link>
                    </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    {rolesWithPermissions.map((r) => (
                        <RolePermissionsCard
                            key={r.roleId}
                            roleId={r.roleId}
                            roleName={r.roleName}
                            permissions={r.permissions}
                            users={r.users}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
