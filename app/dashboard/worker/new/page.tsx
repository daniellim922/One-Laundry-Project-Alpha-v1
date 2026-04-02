import { requirePermission } from "@/utils/permissions/require-permission";
import { FormPageLayout } from "@/components/form-page-layout";
import { WorkerForm } from "../worker-form";

export default async function NewWorkerPage() {
    await requirePermission("Workers", "create");
    return (
        <FormPageLayout
            title="Add New Worker"
            subtitle="Create a new worker with the form below.">
            <WorkerForm />
        </FormPageLayout>
    );
}
