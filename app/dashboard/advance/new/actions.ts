"use server";

import { revalidatePath } from "next/cache";

import {
    createAdvanceRequestRecord,
    type SaveAdvanceRequestInput,
} from "@/services/advance/save-advance-request";
import { requirePermission } from "@/utils/permissions/require-permission";

type ActionResult = { success: true } | { success: false; error: string };

export type CreateAdvanceRequestInput = SaveAdvanceRequestInput;

export async function createAdvanceRequest(
    input: CreateAdvanceRequestInput,
): Promise<ActionResult> {
    await requirePermission("Advance", "create");

    const result = await createAdvanceRequestRecord(input);
    if (!result.success) {
        return result;
    }

    revalidatePath("/dashboard/advance");
    revalidatePath("/dashboard/advance/all");
    revalidatePath("/dashboard/payroll");
    revalidatePath("/dashboard/payroll/all");

    return { success: true };
}
