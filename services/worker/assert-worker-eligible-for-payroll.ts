import type { SelectWorker } from "@/db/tables/workerTable";

export type PayrollEligibleWorker = Pick<SelectWorker, "name" | "status">;

export function assertWorkerEligibleForPayroll(
    worker: PayrollEligibleWorker,
): { success: true } | { error: string } {
    if (worker.status === "Active") {
        return { success: true };
    }

    return {
        error: `Cannot create payroll for ${worker.name} because worker status is ${worker.status}`,
    };
}
