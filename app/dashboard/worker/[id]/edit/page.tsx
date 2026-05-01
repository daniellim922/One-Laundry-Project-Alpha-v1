import { notFound } from "next/navigation";

import { FormPageLayout } from "@/components/form-page-layout";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { WorkerForm } from "../../worker-form";
import { loadWorkerById } from "../_shared/load-worker";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function EditWorkerPage({ params }: PageProps) {
    const { id } = await params;

    const worker = await loadWorkerById(id);

    if (!worker) {
        notFound();
    }

    return (
        <FormPageLayout
            title="Edit worker"
            subtitle="Update this worker's details."
            status={<EntityStatusBadge status={worker.status} />}>
            <WorkerForm worker={worker} />
        </FormPageLayout>
    );
}
