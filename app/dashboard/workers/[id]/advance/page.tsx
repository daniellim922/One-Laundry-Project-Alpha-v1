import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { requirePermission } from "@/lib/require-permission";
import { db } from "@/lib/db";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { WorkerFormPageLayout } from "../../worker-form-page-layout";
import { AdvanceForm } from "./advance-form";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function WorkerAdvancePage({ params }: PageProps) {
    await requirePermission("Payroll", "create");

    const { id } = await params;

    const [worker] = await db
        .select({ id: workerTable.id, name: workerTable.name })
        .from(workerTable)
        .where(eq(workerTable.id, id))
        .limit(1);

    if (!worker) {
        notFound();
    }

    return (
        <WorkerFormPageLayout
            title="Add advance"
            description={`Create an advance record for ${worker.name}.`}>
            <AdvanceForm workerId={worker.id} workerName={worker.name} />
        </WorkerFormPageLayout>
    );
}

