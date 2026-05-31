import { eq } from "drizzle-orm";

import type { WorkerUpsertValues } from "@/db/schemas/worker-employment";
import { employmentTable } from "@/db/tables/employmentTable";
import { workerTable, type InsertWorker } from "@/db/tables/workerTable";
import { db } from "@/lib/db";
import { synchronizeWorkerDraftPayrollsInTx } from "@/services/payroll/synchronize-worker-draft-payrolls";
import { workerUpsertToRows } from "@/services/worker/worker-upsert-rows";

type SaveWorkerResult =
    | { success: true; id: string }
    | { success: false; error: string };

export async function createWorker(
    data: WorkerUpsertValues,
): Promise<SaveWorkerResult> {
    const { worker, employment } = workerUpsertToRows(data);

    try {
        const workerId = await db.transaction(async (tx) => {
            const [employmentRow] = await tx
                .insert(employmentTable)
                .values({
                    ...employment,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })
                .returning({ id: employmentTable.id });

            const employmentId = employmentRow?.id;
            if (!employmentId) {
                throw new Error("Failed to create employment");
            }

            const [workerRow] = await tx
                .insert(workerTable)
                .values({
                    ...worker,
                    employmentId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                } satisfies InsertWorker)
                .returning({ id: workerTable.id });

            const id = workerRow?.id;
            if (!id) {
                throw new Error("Failed to create worker");
            }

            return id;
        });

        return { success: true, id: workerId };
    } catch (error) {
        console.error("Error creating worker", error);
        return { success: false, error: "Failed to create worker" };
    }
}

export async function updateWorker(
    id: string,
    data: WorkerUpsertValues,
): Promise<SaveWorkerResult> {
    const { worker, employment } = workerUpsertToRows(data);

    try {
        const [existing] = await db
            .select({
                id: workerTable.id,
                employmentId: workerTable.employmentId,
            })
            .from(workerTable)
            .where(eq(workerTable.id, id))
            .limit(1);

        if (!existing) {
            return { success: false, error: "Worker not found" };
        }

        await db.transaction(async (tx) => {
            await tx
                .update(employmentTable)
                .set({
                    ...employment,
                    updatedAt: new Date(),
                })
                .where(eq(employmentTable.id, existing.employmentId));

            await tx
                .update(workerTable)
                .set({
                    ...worker,
                    updatedAt: new Date(),
                })
                .where(eq(workerTable.id, id));

            const sync = await synchronizeWorkerDraftPayrollsInTx(tx, {
                workerId: id,
            });
            if ("error" in sync) {
                throw new Error(sync.error);
            }
        });

        return { success: true, id };
    } catch (error) {
        console.error("Error updating worker", error);
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return { success: false, error: "Failed to update worker" };
    }
}
