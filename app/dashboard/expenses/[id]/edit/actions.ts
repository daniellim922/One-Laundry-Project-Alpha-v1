"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentDashboardUser } from "@/app/dashboard/_shared/auth";
import type { ExpenseFormValues } from "@/db/schemas/expense";
import { updateExpenseRecord } from "@/services/expense/save-expense";

type UpdateExpenseResult =
    | { success: true }
    | { success: false; error: string; details?: unknown };

export async function updateExpense(
    id: string,
    input: ExpenseFormValues,
): Promise<UpdateExpenseResult> {
    await requireCurrentDashboardUser();

    const result = await updateExpenseRecord(id, input);
    if (!result.success) {
        if (result.error.code === "VALIDATION") {
            return {
                success: false,
                error: "Validation failed",
                details: result.error.details,
            };
        }
        return { success: false, error: "Expense not found" };
    }

    revalidatePath("/dashboard/expenses");
    revalidatePath("/dashboard/expenses/all");
    revalidatePath(`/dashboard/expenses/${id}`);
    revalidatePath(`/dashboard/expenses/${id}/edit`);
    return { success: true };
}
