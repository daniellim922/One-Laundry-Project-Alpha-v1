import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { workersTable, type SelectWorker } from "@/db/tables/workersTable";
import { WorkerForm } from "../../worker-form";
import { WorkerFormPageLayout } from "../../worker-form-page-layout";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function EditWorkerPage({ params }: PageProps) {
    const { id } = await params;

    const [worker]: SelectWorker[] = await db
        .select()
        .from(workersTable)
        .where(eq(workersTable.id, id))
        .limit(1);

    if (!worker) {
        notFound();
    }

    return (
        <WorkerFormPageLayout
            title="Edit worker"
            description="Update this worker's details.">
            <WorkerForm worker={worker} />
        </WorkerFormPageLayout>
    );
}
