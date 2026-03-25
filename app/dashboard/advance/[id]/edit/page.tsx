import { asc } from "drizzle-orm";
import { notFound } from "next/navigation";

import { BackButton } from "@/components/back-button";
import { db } from "@/lib/db";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { requirePermission } from "@/lib/require-permission";
import { getAdvanceRequestByIdWithWorker } from "@/lib/advances-queries";

import { AdvanceRequestForm } from "../../new/advance-request-form";

export default async function AdvanceEditPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await requirePermission("Payroll", "update");

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
        <div className="mx-auto w-full max-w-screen-2xl space-y-8">
            <div className="flex items-center gap-3">
                <BackButton href="/dashboard/advance/all" />
                <div>
                    <h1 className="text-xl font-semibold tracking-wide uppercase">
                        Edit advance request
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Detail for worker {detail.request.workerName}
                    </p>
                </div>
            </div>

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
        </div>
    );
}
