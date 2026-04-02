import { requirePermission } from "@/utils/permissions/require-permission";
import { FormPageLayout } from "@/components/form-page-layout";
import { CreateUserForm } from "@/app/dashboard/iam/user-form";

interface PageProps {
    searchParams: Promise<{ roleId?: string }>;
}

export default async function NewUserPage({ searchParams }: PageProps) {
    await requirePermission("IAM (Identity and Access Management)", "create");

    const { roleId } = await searchParams;

    return (
        <FormPageLayout
            title="Add user"
            subtitle={
                roleId
                    ? "Create a new user with email and password. The user will be assigned the selected role."
                    : "Create a new user with email and password."
            }
            maxWidthClassName="max-w-2xl">
            <CreateUserForm roleId={roleId} />
        </FormPageLayout>
    );
}
