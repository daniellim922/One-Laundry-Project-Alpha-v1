import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/db/auth-schema";
import { rolesTable } from "@/db/tables/rolesTable";
import { userRolesTable } from "@/db/tables/userRolesTable";
import { columns, type AdminUserRow } from "./columns";
import { DataTable } from "@/components/data-table";

export default async function Page() {
    const users = await db.select().from(user).orderBy(user.createdAt);
    const userRoleLinks = await db
        .select({
            userId: userRolesTable.userId,
            roleName: rolesTable.name,
        })
        .from(userRolesTable)
        .innerJoin(rolesTable, eq(userRolesTable.roleId, rolesTable.id));

    const roleMap = new Map<string, string[]>();
    for (const link of userRoleLinks) {
        const arr = roleMap.get(link.userId) ?? [];
        arr.push(link.roleName);
        roleMap.set(link.userId, arr);
    }

    const rows: AdminUserRow[] = users.map((u) => {
        const roles = roleMap.get(u.id) ?? [];
        return {
            id: u.id,
            name: u.name,
            email: u.email,
            username: u.username,
            roles,
            rolesDisplay: roles.join(", "),
            createdAt: u.createdAt,
        };
    });

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
                <p className="text-muted-foreground">
                    Manage users and their roles.
                </p>
            </div>

            <Suspense
                fallback={
                    <div className="rounded-md border p-6 text-sm text-muted-foreground">
                        Loading...
                    </div>
                }>
                <DataTable
                    columns={columns}
                    data={rows}
                    searchKey="name"
                    searchParamKey="search"
                />
            </Suspense>
        </div>
    );
}
