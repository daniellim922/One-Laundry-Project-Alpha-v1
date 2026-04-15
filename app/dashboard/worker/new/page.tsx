import { FormPageLayout } from "@/components/form-page-layout";
import { WorkerForm } from "../worker-form";

export default function NewWorkerPage() {
    return (
        <FormPageLayout
            title="Add New Worker"
            subtitle="Create a new worker with the form below.">
            <WorkerForm />
        </FormPageLayout>
    );
}
