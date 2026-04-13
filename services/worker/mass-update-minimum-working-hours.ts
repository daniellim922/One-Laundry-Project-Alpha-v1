import { eq } from "drizzle-orm";

import { employmentTable } from "@/db/tables/payroll/employmentTable";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { db } from "@/lib/db";
import { synchronizeWorkerDraftPayrollsInTx } from "@/services/payroll/synchronize-worker-draft-payrolls";

export type WorkerHoursBulkUpdateInput = {
    updates: Array<{
        workerId: string;
        minimumWorkingHours: number;
    }>;
};

export type WorkerHoursBulkUpdateResult = {
    updatedCount: number;
    failed: Array<{
        workerId: string;
        workerName: string;
        error: string;
    }>;
};

class MassEditWorkingHoursError extends Error {
    workerId: string;
    workerName: string;

    constructor(input: { workerId: string; workerName: string; error: string }) {
        super(input.error);
        this.workerId = input.workerId;
        this.workerName = input.workerName;
    }
}

export async function massUpdateWorkerMinimumWorkingHours(
    input: WorkerHoursBulkUpdateInput,
): Promise<WorkerHoursBulkUpdateResult> {
    const updates = Array.isArray(input?.updates) ? input.updates : [];
    if (updates.length === 0) {
        return { updatedCount: 0, failed: [] };
    }

    let updatedCount = 0;
    const failed: WorkerHoursBulkUpdateResult["failed"] = [];

    for (const update of updates) {
        const workerId = update.workerId?.trim();
        const minimumWorkingHours = Number(update.minimumWorkingHours);

        if (!workerId) {
            failed.push({
                workerId: "",
                workerName: "Unknown worker",
                error: "Missing worker ID",
            });
            continue;
        }

        if (
            !Number.isFinite(minimumWorkingHours) ||
            minimumWorkingHours < 0
        ) {
            failed.push({
                workerId,
                workerName: "Unknown worker",
                error: "Minimum working hours must be a non-negative number",
            });
            continue;
        }

        try {
            await db.transaction(async (tx) => {
                const [worker] = await tx
                    .select({
                        id: workerTable.id,
                        name: workerTable.name,
                        status: workerTable.status,
                        employmentId: workerTable.employmentId,
                        employmentType: employmentTable.employmentType,
                    })
                    .from(workerTable)
                    .innerJoin(
                        employmentTable,
                        eq(workerTable.employmentId, employmentTable.id),
                    )
                    .where(eq(workerTable.id, workerId))
                    .limit(1);

                const workerName = worker?.name ?? "Unknown worker";
                if (!worker) {
                    throw new MassEditWorkingHoursError({
                        workerId,
                        workerName,
                        error: "Worker not found",
                    });
                }

                if (worker.status !== "Active") {
                    throw new MassEditWorkingHoursError({
                        workerId,
                        workerName,
                        error: "Only active workers can be updated",
                    });
                }

                if (worker.employmentType !== "Full Time") {
                    throw new MassEditWorkingHoursError({
                        workerId,
                        workerName,
                        error: "Only Full Time workers can be updated",
                    });
                }

                await tx
                    .update(employmentTable)
                    .set({
                        minimumWorkingHours,
                        updatedAt: new Date(),
                    })
                    .where(eq(employmentTable.id, worker.employmentId));

                const sync = await synchronizeWorkerDraftPayrollsInTx(tx, {
                    workerId,
                });
                if ("error" in sync) {
                    throw new MassEditWorkingHoursError({
                        workerId,
                        workerName,
                        error: sync.error,
                    });
                }
            });

            updatedCount += 1;
        } catch (error) {
            if (error instanceof MassEditWorkingHoursError) {
                failed.push({
                    workerId: error.workerId,
                    workerName: error.workerName,
                    error: error.message,
                });
                continue;
            }

            console.error("Error mass editing worker minimum hours", error);
            failed.push({
                workerId,
                workerName: "Unknown worker",
                error: "Failed to update worker minimum hours",
            });
        }
    }

    return { updatedCount, failed };
}
