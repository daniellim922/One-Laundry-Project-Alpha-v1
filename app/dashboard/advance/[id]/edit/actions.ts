"use server";

import { revalidatePath } from "next/cache";

import {
    type SaveAdvanceRequestInput,
    updateAdvanceRequestRecord,
} from "@/services/advance/save-advance-request";
import { requirePermission } from "@/utils/permissions/require-permission";

type ActionResult = { success: true } | { success: false; error: string };

export type UpdateAdvanceRequestInput = SaveAdvanceRequestInput;

export async function updateAdvanceRequest(
    advanceRequestId: string,
    input: UpdateAdvanceRequestInput,
): Promise<ActionResult> {
    await requirePermission("Advance", "update");

    const result = await updateAdvanceRequestRecord(advanceRequestId, input);
    if (!result.success) {
        return result;
    }

    revalidatePath("/dashboard/advance");
    revalidatePath("/dashboard/advance/all");
    revalidatePath(`/dashboard/advance/${advanceRequestId}`);
    revalidatePath("/dashboard/payroll");
    revalidatePath("/dashboard/payroll/all");

    return { success: true };
}
