import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { requirePermission } from "@/lib/require-permission";
import { db } from "@/lib/db";
import { workersTable, type SelectWorker } from "@/db/tables/workersTable";
import { WorkerForm } from "../../worker-form";
import { WorkerFormPageLayout } from "../../worker-form-page-layout";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function ViewWorkerPage({ params }: PageProps) {
    await requirePermission("Workers", "read");

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
            title="View worker"
            description="Worker details (read-only).">
            <WorkerForm worker={worker} disabled />
        </WorkerFormPageLayout>
    );
}
