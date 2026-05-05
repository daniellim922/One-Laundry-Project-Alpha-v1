"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentDashboardUser } from "@/app/dashboard/_shared/auth";
import type { ExpenseFormValues } from "@/db/schemas/expense";
import { insertExpenseRecord } from "@/services/expense/save-expense";

type CreateExpenseResult =
    | { success: true; id: string }
    | { success: false; error: string; details?: unknown };

export async function createExpense(
    input: ExpenseFormValues,
): Promise<CreateExpenseResult> {
    await requireCurrentDashboardUser();

    const result = await insertExpenseRecord(input);
    if (!result.success) {
        if (result.error.code === "VALIDATION") {
            return {
                success: false,
                error: "Validation failed",
                details: result.error.details,
            };
        }
        return { success: false, error: "Could not save expense" };
    }

    revalidatePath("/dashboard/expenses");
    revalidatePath("/dashboard/expenses/all");
    return { success: true, id: result.id };
}
