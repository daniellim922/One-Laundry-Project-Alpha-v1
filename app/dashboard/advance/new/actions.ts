"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentDashboardUser } from "@/app/dashboard/_shared/auth";
import {
    createAdvanceRequestRecord,
    type SaveAdvanceRequestInput,
} from "@/services/advance/save-advance-request";

type ActionResult = { success: true } | { success: false; error: string };

export type CreateAdvanceRequestInput = SaveAdvanceRequestInput;

export async function createAdvanceRequest(
    input: CreateAdvanceRequestInput,
): Promise<ActionResult> {
    await requireCurrentDashboardUser();

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
