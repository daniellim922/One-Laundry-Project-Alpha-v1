import {
    assertWorkerActiveForAction,
    type ActiveWorker,
} from "@/services/worker/assert-worker-active-for-action";

export type PayrollEligibleWorker = ActiveWorker;

export function assertWorkerEligibleForPayroll(
    worker: PayrollEligibleWorker,
): { success: true } | { error: string } {
    return assertWorkerActiveForAction(worker, "create payroll");
}
