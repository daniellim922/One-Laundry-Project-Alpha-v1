import { requirePermission } from "@/utils/require-permission";
import { FormPageLayout } from "@/components/form-page-layout";

export default async function NewExpensePage() {
    await requirePermission("Expenses", "create");
    return (
        <FormPageLayout
            title="New expense"
            subtitle="Add a new expense. Form coming soon."
        >
            {null}
        </FormPageLayout>
    );
}
