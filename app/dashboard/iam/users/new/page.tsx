import { requirePermission } from "@/lib/require-permission";
import { CreateUserForm } from "@/app/dashboard/iam/user-form";

interface PageProps {
    searchParams: Promise<{ roleId?: string }>;
}

export default async function NewUserPage({ searchParams }: PageProps) {
    await requirePermission("IAM (Identity and Access Management)", "create");

    const { roleId } = await searchParams;

    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-start justify-center">
            <div className="w-full max-w-2xl space-y-6 py-8">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Add user
                    </h1>
                    <p className="text-muted-foreground">
                        {roleId
                            ? "Create a new user with email and password. The user will be assigned the selected role."
                            : "Create a new user with email and password."}
                    </p>
                </div>

                <CreateUserForm roleId={roleId} />
            </div>
        </div>
    );
}
