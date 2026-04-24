import type { SelectWorker } from "@/db/tables/workerTable";

export type ActiveWorker = Pick<SelectWorker, "name" | "status">;

export function assertWorkerActiveForAction(
    worker: ActiveWorker,
    action: string,
): { success: true } | { error: string } {
    if (worker.status === "Active") {
        return { success: true };
    }

    return {
        error: `Cannot ${action} for ${worker.name} because worker status is ${worker.status}`,
    };
}
