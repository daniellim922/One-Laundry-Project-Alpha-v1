"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentDashboardUser } from "@/app/dashboard/_shared/auth";
import {
    formatWorkerUpsertZodError,
    workerUpsertSchema,
} from "@/db/schemas/worker-employment";
import {
    createWorker as createWorkerRecord,
    updateWorker as updateWorkerRecord,
} from "@/services/worker/save-worker";

type ActionResult =
    | { success: true; id: string }
    | { success: false; error: string };

export async function createWorker(input: unknown): Promise<ActionResult> {
    await requireCurrentDashboardUser();

    const parsed = workerUpsertSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: formatWorkerUpsertZodError(parsed.error),
        };
    }

    const result = await createWorkerRecord(parsed.data);
    if (!result.success) {
        return result;
    }

    revalidatePath("/dashboard/worker");
    revalidatePath("/dashboard/worker/all");

    return result;
}

export async function updateWorker(
    id: string,
    input: unknown,
): Promise<ActionResult> {
    await requireCurrentDashboardUser();

    if (!id) {
        return { success: false, error: "Worker ID is required" };
    }

    const parsed = workerUpsertSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: formatWorkerUpsertZodError(parsed.error),
        };
    }

    const result = await updateWorkerRecord(id, parsed.data);
    if (!result.success) {
        return result;
    }

    revalidatePath("/dashboard/worker");
    revalidatePath("/dashboard/worker/all");
    revalidatePath("/dashboard/payroll");
    revalidatePath("/dashboard/payroll/all");
    revalidatePath("/dashboard/payroll/[id]/summary", "page");
    revalidatePath("/dashboard/payroll/[id]/breakdown", "page");

    return result;
}
