"use server";

import { revalidatePath } from "next/cache";

import { synchronizeWorkerDraftPayrolls } from "@/app/dashboard/payroll/actions";
import { localIsoDateYmd } from "@/utils/time/local-iso-date";
import { requirePermission } from "@/utils/permissions/require-permission";
import { db } from "@/lib/db";
import {
    advanceRequestTable,
    type InsertAdvanceRequest,
} from "@/db/tables/payroll/advanceRequestTable";
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

export type CreateAdvanceRequestInput = {
    workerId: string;
    requestDate: string;
    amount: string;
    purpose?: string;
    installmentAmounts: Array<{ amount?: string; repaymentDate?: string }>;
    employeeSignature?: string;
    employeeSignatureDate?: string;
    managerSignature?: string;
    managerSignatureDate?: string;
};

export async function createAdvanceRequest(
    input: CreateAdvanceRequestInput,
): Promise<ActionResult> {
    await requirePermission("Advance", "create");

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

    const validInstallments = input.installmentAmounts
        .map((row) => {
            const repaymentDate = parseDateString(row.repaymentDate);
            const amount = parsePositiveInt(row.amount);
            if (repaymentDate && amount != null) return { repaymentDate, amount };
            return null;
        })
        .filter((r): r is { repaymentDate: string; amount: number } => r != null);

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
        if (inst.repaymentDate < today) {
            return {
                success: false,
                error: "Expected repayment date cannot be before today",
            };
        }
    }

    const employeeSignatureDate = parseDateString(input.employeeSignatureDate);
    const managerSignatureDate = parseDateString(input.managerSignatureDate);

    try {
        const now = new Date();
        await db.transaction(async (tx) => {
            const requestInsert: InsertAdvanceRequest = {
                workerId: input.workerId,
                status: "Advance Loan",
                requestDate,
                amountRequested,
                purpose: input.purpose?.trim() || null,
                employeeSignature: input.employeeSignature?.trim() || null,
                employeeSignatureDate: employeeSignatureDate ?? null,
                managerSignature: input.managerSignature?.trim() || null,
                managerSignatureDate: managerSignatureDate ?? null,
                createdAt: now,
                updatedAt: now,
            };

            const [req] = await tx
                .insert(advanceRequestTable)
                .values(requestInsert)
                .returning({ id: advanceRequestTable.id });

            if (!req) throw new Error("Failed to insert advance request");

            const advanceInserts: InsertAdvance[] = validInstallments.map(
                (inst) => ({
                    advanceRequestId: req.id,
                    amount: inst.amount,
                    status: "Installment Loan" as const,
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
        revalidatePath("/dashboard/advance");
        revalidatePath("/dashboard/advance/all");
        revalidatePath("/dashboard/payroll");
        revalidatePath("/dashboard/payroll/all");

        return { success: true };
    } catch (error) {
        console.error("Error creating advance request", error);
        return { success: false, error: "Failed to create advance request" };
    }
}
