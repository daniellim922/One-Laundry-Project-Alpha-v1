"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/require-permission";
import { db } from "@/lib/db";
import { advanceTable, type InsertAdvance } from "@/db/tables/payroll/advanceTable";

type ActionResult = { success: true } | { success: false; error: string };

function isoNow(): Date {
    return new Date();
}

function parsePositiveInt(val: FormDataEntryValue | null): number | null {
    if (val == null) return null;
    const s = String(val).trim();
    if (!s) return null;
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    const int = Math.trunc(n);
    if (int <= 0) return null;
    return int;
}

function parseDateString(val: FormDataEntryValue | null): string | null {
    if (val == null) return null;
    const s = String(val).trim();
    if (!s) return null;
    // Expect YYYY-MM-DD (from <input type="date" />)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    return s;
}

export async function createAdvance(
    workerId: string,
    formData: FormData,
): Promise<ActionResult> {
    await requirePermission("Payroll", "create");

    if (!workerId) {
        return { success: false, error: "Worker ID is required" };
    }

    const amount = parsePositiveInt(formData.get("amount"));
    if (amount == null) {
        return { success: false, error: "Amount must be a positive integer" };
    }

    const statusRaw = (formData.get("status") ?? "loan").toString().trim();
    const status = (statusRaw === "paid" ? "paid" : "loan") as InsertAdvance["status"];

    const loanDate = parseDateString(formData.get("loanDate"));
    if (!loanDate) {
        return { success: false, error: "Loan date is required" };
    }

    const repaymentDate = parseDateString(formData.get("repaymentDate"));

    if (repaymentDate && repaymentDate < loanDate) {
        return {
            success: false,
            error: "Repayment date must be on or after loan date",
        };
    }

    const now = isoNow();

    try {
        await db.insert(advanceTable).values({
            workerId,
            amount,
            status,
            loanDate,
            repaymentDate: repaymentDate ?? null,
            createdAt: now,
            updatedAt: now,
        } satisfies InsertAdvance);

        revalidatePath("/dashboard/workers");
        revalidatePath(`/dashboard/workers/${workerId}/view`);
        revalidatePath("/dashboard/advance");

        return { success: true };
    } catch (error) {
        console.error("Error creating advance", error);
        return { success: false, error: "Failed to create advance" };
    }
}

