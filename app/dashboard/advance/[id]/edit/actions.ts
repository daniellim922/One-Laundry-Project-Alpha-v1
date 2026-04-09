"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { synchronizeWorkerDraftPayrolls } from "@/app/dashboard/payroll/actions";
import { localIsoDateYmd } from "@/utils/time/local-iso-date";
import { requirePermission } from "@/utils/permissions/require-permission";
import { db } from "@/lib/db";
import { advanceRequestTable } from "@/db/tables/payroll/advanceRequestTable";
import {
    advanceTable,
    type InsertAdvance,
} from "@/db/tables/payroll/advanceTable";

type ActionResult = { success: true } | { success: false; error: string };

function parsePositiveInt(val: string | null | undefined): number | null {
    if (val == null) return null;
    const s = String(val).trim();
    if (!s) return null;
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    const int = Math.trunc(n);
    if (int <= 0) return null;
    return int;
}

function parseDateString(val: string | null | undefined): string | null {
    if (val == null) return null;
    const s = String(val).trim();
    if (!s) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    return s;
}

function parseInstallmentStatus(
    val: string | null | undefined,
): "Installment Loan" | "Installment Paid" | null {
    if (val == null) return null;
    const s = String(val).trim();
    if (s === "Installment Loan" || s === "Installment Paid") return s;
    return null;
}

export type UpdateAdvanceRequestInput = {
    workerId: string;
    requestDate: string;
    amount: string;
    purpose?: string;
    installmentAmounts: Array<{
        amount?: string;
        repaymentDate?: string;
        status?: "Installment Loan" | "Installment Paid";
    }>;
    employeeSignature?: string;
    employeeSignatureDate?: string;
    managerSignature?: string;
    managerSignatureDate?: string;
};

export async function updateAdvanceRequest(
    advanceRequestId: string,
    input: UpdateAdvanceRequestInput,
): Promise<ActionResult> {
    await requirePermission("Advance", "update");

    if (!input.workerId) {
        return { success: false, error: "Worker ID is required" };
    }

    const amountRequested = parsePositiveInt(input.amount);
    if (amountRequested == null) {
        return { success: false, error: "Amount must be a positive integer" };
    }

    const requestDate = parseDateString(input.requestDate);
    if (!requestDate) {
        return { success: false, error: "Date of request is required" };
    }

    const validInstallments: Array<{
        repaymentDate: string;
        amount: number;
        status: "Installment Loan" | "Installment Paid";
    }> = [];
    for (const row of input.installmentAmounts) {
        const rawRepaymentDate = row.repaymentDate?.trim() ?? "";
        const rawAmount = row.amount?.trim() ?? "";
        const hasRepaymentDate = rawRepaymentDate.length > 0;
        const hasAmount = rawAmount.length > 0;

        if (!hasRepaymentDate && !hasAmount) continue;

        if (hasAmount && !hasRepaymentDate) {
            return {
                success: false,
                error: "Expected repayment date is required when installment amount is set",
            };
        }

        if (hasRepaymentDate && !hasAmount) {
            return {
                success: false,
                error: "Installment amount is required when repayment date is set",
            };
        }

        const repaymentDate = parseDateString(rawRepaymentDate);
        if (!repaymentDate) {
            return {
                success: false,
                error: "Installment repayment date must be a valid date",
            };
        }

        const amount = parsePositiveInt(rawAmount);
        if (amount == null) {
            return {
                success: false,
                error: "Installment amount must be a positive integer",
            };
        }

        const status = parseInstallmentStatus(row.status);
        if (!status) {
            return {
                success: false,
                error: "Installment status must be Installment Loan or Installment Paid",
            };
        }
        validInstallments.push({ repaymentDate, amount, status });
    }

    if (validInstallments.length === 0) {
        return {
            success: false,
            error: "At least one installment with amount and repayment date is required",
        };
    }

    for (const inst of validInstallments) {
        if (inst.amount > amountRequested) {
            return {
                success: false,
                error: `Installment amount ($${inst.amount}) cannot exceed amount requested ($${amountRequested})`,
            };
        }
    }
    const totalInstallments = validInstallments.reduce(
        (sum, i) => sum + i.amount,
        0,
    );
    if (totalInstallments !== amountRequested) {
        return {
            success: false,
            error: `Total of installments ($${totalInstallments}) must equal amount requested ($${amountRequested})`,
        };
    }

    for (const inst of validInstallments) {
        if (inst.repaymentDate < requestDate) {
            return {
                success: false,
                error: "Repayment date must be on or after date of request",
            };
        }
    }

    const today = localIsoDateYmd();
    for (const inst of validInstallments) {
        if (inst.status !== "Installment Paid" && inst.repaymentDate < today) {
            return {
                success: false,
                error: "Expected repayment date cannot be before today",
            };
        }
    }

    const employeeSignatureDate = parseDateString(input.employeeSignatureDate);
    const managerSignatureDate = parseDateString(input.managerSignatureDate);

    const [existing] = await db
        .select({ workerId: advanceRequestTable.workerId })
        .from(advanceRequestTable)
        .where(eq(advanceRequestTable.id, advanceRequestId))
        .limit(1);
    const oldWorkerId = existing?.workerId ?? null;

    const now = new Date();

    try {
        await db.transaction(async (tx) => {
            await tx
                .update(advanceRequestTable)
                .set({
                    workerId: input.workerId,
                    requestDate,
                    amountRequested,
                    purpose: input.purpose?.trim() || null,
                    employeeSignature: input.employeeSignature?.trim() || null,
                    employeeSignatureDate: employeeSignatureDate ?? null,
                    managerSignature: input.managerSignature?.trim() || null,
                    managerSignatureDate: managerSignatureDate ?? null,
                    updatedAt: now,
                })
                .where(eq(advanceRequestTable.id, advanceRequestId));

            await tx
                .delete(advanceTable)
                .where(eq(advanceTable.advanceRequestId, advanceRequestId));

            const advanceInserts: InsertAdvance[] = validInstallments.map(
                (inst) => ({
                    advanceRequestId,
                    amount: inst.amount,
                    status: inst.status,
                    repaymentDate: inst.repaymentDate,
                    createdAt: now,
                    updatedAt: now,
                }),
            );

            await tx.insert(advanceTable).values(advanceInserts);
        });

        const sync = await synchronizeWorkerDraftPayrolls({
            workerId: input.workerId,
        });
        if ("error" in sync) {
            return { success: false, error: sync.error };
        }
        if (oldWorkerId && oldWorkerId !== input.workerId) {
            const syncOld = await synchronizeWorkerDraftPayrolls({
                workerId: oldWorkerId,
            });
            if ("error" in syncOld) {
                return { success: false, error: syncOld.error };
            }
        }
        revalidatePath("/dashboard/advance");
        revalidatePath("/dashboard/advance/all");
        revalidatePath(`/dashboard/advance/${advanceRequestId}`);
        revalidatePath("/dashboard/payroll");
        revalidatePath("/dashboard/payroll/all");

        return { success: true };
    } catch (error) {
        console.error("Error updating advance request", error);
        return { success: false, error: "Failed to update advance request" };
    }
}
