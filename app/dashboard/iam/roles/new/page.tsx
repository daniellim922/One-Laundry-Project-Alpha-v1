import { requirePermission } from "@/lib/require-permission";
import { db } from "@/lib/db";
import { featuresTable } from "@/db/tables/auth/featuresTable";
import { RoleForm } from "@/app/dashboard/iam/role-form";

export default async function NewRolePage() {
    await requirePermission("IAM (Identity and Access Management)", "create");

    const features = await db
        .select({ id: featuresTable.id, name: featuresTable.name })
        .from(featuresTable)
        .orderBy(featuresTable.name);

    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-start justify-center">
            <div className="w-full max-w-3xl space-y-6 py-8">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Add role
                    </h1>
                    <p className="text-muted-foreground">
                        Create a new role with the form below and assign
                        permissions per feature.
                    </p>
                </div>

                <RoleForm features={features} />
            </div>
        </div>
    );
}
