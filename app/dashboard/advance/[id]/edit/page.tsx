import { asc } from "drizzle-orm";
import { notFound } from "next/navigation";

import { FormPageLayout } from "@/components/form-page-layout";
import { db } from "@/lib/db";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { getAdvanceRequestByIdWithWorker } from "@/utils/advance/queries";

import { AdvanceRequestForm } from "@/app/dashboard/advance/advance-request-form";

export default async function AdvanceEditPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const [detail, workers] = await Promise.all([
        getAdvanceRequestByIdWithWorker(id),
        db
            .select({
                id: workerTable.id,
                name: workerTable.name,
            })
            .from(workerTable)
            .orderBy(asc(workerTable.name)),
    ]);

    if (!detail) {
        notFound();
    }

    return (
        <FormPageLayout
            title="Edit advance request"
            subtitle={`Detail for worker ${detail.request.workerName}`}>
            {workers.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                    No workers yet. Add a worker first.
                </p>
            ) : (
                <AdvanceRequestForm
                    key={id}
                    workers={workers}
                    initialData={detail}
                    advanceRequestId={id}
                />
            )}
        </FormPageLayout>
    );
}
