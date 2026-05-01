import Link from "next/link";
import { notFound } from "next/navigation";

import { FormPageLayout } from "@/components/form-page-layout";
import { Button } from "@/components/ui/button";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { Pencil } from "lucide-react";
import { WorkerForm } from "../../worker-form";
import { loadWorkerById } from "../_shared/load-worker";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function ViewWorkerPage({ params }: PageProps) {
    const { id } = await params;

    const worker = await loadWorkerById(id);

    if (!worker) {
        notFound();
    }

    return (
        <FormPageLayout
            title="View worker"
            subtitle="Worker details (read-only)."
            status={<EntityStatusBadge status={worker.status} />}
            actions={
                <Button asChild variant="outline">
                    <Link
                        href={`/dashboard/worker/${id}/edit`}
                        className="flex items-center gap-2">
                        <Pencil className="h-4 w-4" />
                        Edit
                    </Link>
                </Button>
            }>
            <WorkerForm worker={worker} disabled />
        </FormPageLayout>
    );
}
