import {
    assertWorkerActiveForAction,
    type ActiveWorker,
} from "@/services/worker/assert-worker-active-for-action";

export type TimesheetEligibleWorker = ActiveWorker;

export function assertWorkerEligibleForTimesheet(
    worker: TimesheetEligibleWorker,
    action: "create timesheet" | "import timesheet",
): { success: true } | { error: string } {
    return assertWorkerActiveForAction(worker, action);
}
