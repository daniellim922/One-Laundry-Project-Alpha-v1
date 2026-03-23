import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { requirePermission } from "@/lib/require-permission";
import { db } from "@/lib/db";
import { user } from "@/db/auth-schema";
import { rolesTable } from "@/db/tables/auth/rolesTable";
import { userRolesTable } from "@/db/tables/auth/userRolesTable";
import { EditUserForm } from "../../../edit-user-form";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function EditUserPage({ params }: PageProps) {
    await requirePermission("IAM (Identity and Access Management)", "update");

    const { id } = await params;

    const [userRow] = await db
        .select()
        .from(user)
        .where(eq(user.id, id))
        .limit(1);

    if (!userRow) {
        notFound();
    }

    const [roles, userRoles] = await Promise.all([
        db
            .select({ id: rolesTable.id, name: rolesTable.name })
            .from(rolesTable),
        db
            .select({ roleId: userRolesTable.roleId })
            .from(userRolesTable)
            .where(eq(userRolesTable.userId, id)),
    ]);

    const currentRoleIds = userRoles
        .map((r) => r.roleId)
        .filter((rid): rid is string => rid != null);

    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-start justify-center">
            <div className="w-full max-w-2xl space-y-6 py-8">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Edit user
                    </h1>
                    <p className="text-muted-foreground">
                        Update {userRow.name}&apos;s details.
                    </p>
                </div>

                <EditUserForm
                    user={userRow}
                    roles={roles}
                    currentRoleIds={currentRoleIds}
                />
            </div>
        </div>
    );
}
