import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { requirePermission } from "@/lib/require-permission";
import { db } from "@/lib/db";
import { rolesTable } from "@/db/tables/auth/rolesTable";
import { rolePermissionsTable } from "@/db/tables/auth/rolePermissionsTable";
import { featuresTable } from "@/db/tables/auth/featuresTable";
import { FormPageLayout } from "@/components/form-page-layout";
import { RoleForm } from "../../../role-form";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function EditRolePage({ params }: PageProps) {
    await requirePermission("IAM (Identity and Access Management)", "update");

    const { id } = await params;

    const [role] = await db
        .select()
        .from(rolesTable)
        .where(eq(rolesTable.id, id))
        .limit(1);

    if (!role) {
        notFound();
    }

    const [features, existingPermissions] = await Promise.all([
        db
            .select({ id: featuresTable.id, name: featuresTable.name })
            .from(featuresTable)
            .orderBy(featuresTable.name),
        db
            .select({
                featureId: rolePermissionsTable.featureId,
                create: rolePermissionsTable.create,
                read: rolePermissionsTable.read,
                update: rolePermissionsTable.update,
                delete: rolePermissionsTable.delete,
            })
            .from(rolePermissionsTable)
            .where(eq(rolePermissionsTable.roleId, id)),
    ]);

    const permissionsByFeature = new Map(
        existingPermissions
            .filter((p) => p.featureId != null)
            .map((p) => [
                p.featureId!,
                {
                    create: p.create,
                    read: p.read,
                    update: p.update,
                    delete: p.delete,
                },
            ]),
    );

    const initialPermissions: Record<
        string,
        { create: boolean; read: boolean; update: boolean; delete: boolean }
    > = {};
    for (const f of features) {
        const p = permissionsByFeature.get(f.id);
        initialPermissions[f.id] = p ?? {
            create: false,
            read: false,
            update: false,
            delete: false,
        };
    }

    return (
        <FormPageLayout
            title="Edit role"
            subtitle={`Update permissions for ${role.name}.`}
            maxWidthClassName="max-w-3xl">
            <RoleForm
                features={features}
                mode="edit"
                roleId={id}
                initialName={role.name}
                initialPermissions={initialPermissions}
            />
        </FormPageLayout>
    );
}
