import { WorkerFormPageLayout } from "../worker-form-page-layout";
import { WorkerForm } from "../worker-form";

export default function NewWorkerPage() {
    return (
        <WorkerFormPageLayout
            title="Add worker"
            description="Create a new worker with the form below.">
            <WorkerForm />
        </WorkerFormPageLayout>
    );
}
