import { requirePermission } from "@/lib/require-permission";
import { WorkerFormPageLayout } from "../worker-form-page-layout";
import { WorkerForm } from "../worker-form";

export default async function NewWorkerPage() {
    await requirePermission("Workers", "create");
    return (
        <WorkerFormPageLayout
            title="Add worker"
            description="Create a new worker with the form below.">
            <WorkerForm />
        </WorkerFormPageLayout>
    );
}
