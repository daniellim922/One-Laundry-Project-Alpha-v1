import { requirePermission } from "@/lib/require-permission";
import { db } from "@/lib/db";
import { featuresTable } from "@/db/tables/auth/featuresTable";
import { FormPageLayout } from "@/components/form-page-layout";
import { RoleForm } from "@/app/dashboard/iam/role-form";

export default async function NewRolePage() {
    await requirePermission("IAM (Identity and Access Management)", "create");

    const features = await db
        .select({ id: featuresTable.id, name: featuresTable.name })
        .from(featuresTable)
        .orderBy(featuresTable.name);

    return (
        <FormPageLayout
            title="Add role"
            subtitle="Create a new role with the form below and assign permissions per feature."
            maxWidthClassName="max-w-3xl">
            <RoleForm features={features} />
        </FormPageLayout>
    );
}
