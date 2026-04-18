import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { synchronizeWorkerDraftPayrolls } from "@/services/payroll/synchronize-worker-draft-payrolls";
import { dateToLocalIsoYmd } from "@/utils/time/calendar-date";
import {
    advanceRequestTable,
    type InsertAdvanceRequest,
} from "@/db/tables/advanceRequestTable";
import {
    advanceTable,
    type InsertAdvance,
} from "@/db/tables/advanceTable";

type ActionResult =
    | { success: true; id?: string }
    | { success: false; error: string };

type InstallmentStatus = "Installment Loan" | "Installment Paid";

export type SaveAdvanceRequestInput = {
    workerId: string;
    requestDate: string;
    amount: number;
    purpose?: string;
    installmentAmounts: Array<{
        amount?: number;
        repaymentDate?: string;
        status?: InstallmentStatus;
    }>;
    employeeSignature?: string;
    employeeSignatureDate?: string;
    managerSignature?: string;
    managerSignatureDate?: string;
};

type ParsedInstallment = {
    repaymentDate: string;
    amount: number;
    status: InstallmentStatus;
};

function parseDateString(val: string | null | undefined): string | null {
    if (val == null) return null;
    const s = String(val).trim();
    if (!s) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    return s;
}

function parseInstallmentStatus(
    val: string | null | undefined,
): InstallmentStatus | null {
    if (val == null) return null;
    const s = String(val).trim();
    if (s === "Installment Loan" || s === "Installment Paid") return s;
    return null;
}

function validateAdvanceInput(
    input: SaveAdvanceRequestInput,
    options: { allowPaidInstallments: boolean },
):
    | {
          workerId: string;
          requestDate: string;
          amountRequested: number;
          validInstallments: ParsedInstallment[];
          employeeSignatureDate: string | null;
          managerSignatureDate: string | null;
      }
    | ActionResult {
    const workerId = input.workerId?.trim();
    if (!workerId) {
        return { success: false, error: "Worker ID is required" };
    }

    const amountRequested =
        typeof input.amount === "number" &&
        Number.isInteger(input.amount) &&
        input.amount > 0
            ? input.amount
            : null;
    if (amountRequested == null) {
        return { success: false, error: "Amount must be a positive integer" };
    }

    const requestDate = parseDateString(input.requestDate);
    if (!requestDate) {
        return { success: false, error: "Date of request is required" };
    }

    const validInstallments: ParsedInstallment[] = [];

    for (const row of input.installmentAmounts) {
        const rawRepaymentDate = row.repaymentDate?.trim() ?? "";
        const rowAmount = row.amount;
        const hasRepaymentDate = rawRepaymentDate.length > 0;
        const hasAmount =
            rowAmount != null &&
            Number.isFinite(rowAmount) &&
            Number.isInteger(rowAmount) &&
            rowAmount > 0;

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

        const amount = rowAmount as number;

        const status = options.allowPaidInstallments
            ? parseInstallmentStatus(row.status)
            : "Installment Loan";

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
        (sum, inst) => sum + inst.amount,
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

    const today = dateToLocalIsoYmd();
    for (const inst of validInstallments) {
        if (inst.status !== "Installment Paid" && inst.repaymentDate < today) {
            return {
                success: false,
                error: "Expected repayment date cannot be before today",
            };
        }
    }

    return {
        workerId,
        requestDate,
        amountRequested,
        validInstallments,
        employeeSignatureDate: parseDateString(input.employeeSignatureDate),
        managerSignatureDate: parseDateString(input.managerSignatureDate),
    };
}

export async function createAdvanceRequestRecord(
    input: SaveAdvanceRequestInput,
): Promise<ActionResult> {
    const parsed = validateAdvanceInput(input, {
        allowPaidInstallments: false,
    });
    if ("success" in parsed) {
        return parsed;
    }

    try {
        const now = new Date();
        const requestId = await db.transaction(async (tx) => {
            const requestInsert: InsertAdvanceRequest = {
                workerId: parsed.workerId,
                status: "Advance Loan",
                requestDate: parsed.requestDate,
                amountRequested: parsed.amountRequested,
                purpose: input.purpose?.trim() || null,
                employeeSignature: input.employeeSignature?.trim() || null,
                employeeSignatureDate: parsed.employeeSignatureDate,
                managerSignature: input.managerSignature?.trim() || null,
                managerSignatureDate: parsed.managerSignatureDate,
                createdAt: now,
                updatedAt: now,
            };

            const [request] = await tx
                .insert(advanceRequestTable)
                .values(requestInsert)
                .returning({ id: advanceRequestTable.id });

            if (!request) {
                throw new Error("Failed to insert advance request");
            }

            const advanceInserts: InsertAdvance[] = parsed.validInstallments.map(
                (inst) => ({
                    advanceRequestId: request.id,
                    amount: inst.amount,
                    status: inst.status,
                    repaymentDate: inst.repaymentDate,
                    createdAt: now,
                    updatedAt: now,
                }),
            );

            await tx.insert(advanceTable).values(advanceInserts);
            return request.id;
        });

        const sync = await synchronizeWorkerDraftPayrolls({
            workerId: parsed.workerId,
        });
        if ("error" in sync) {
            return { success: false, error: sync.error };
        }

        return { success: true, id: requestId };
    } catch (error) {
        console.error("Error creating advance request", error);
        return { success: false, error: "Failed to create advance request" };
    }
}

export async function updateAdvanceRequestRecord(
    advanceRequestId: string,
    input: SaveAdvanceRequestInput,
): Promise<ActionResult> {
    const id = advanceRequestId?.trim();
    if (!id) {
        return { success: false, error: "Advance request ID is required" };
    }

    const parsed = validateAdvanceInput(input, {
        allowPaidInstallments: true,
    });
    if ("success" in parsed) {
        return parsed;
    }

    const [existing] = await db
        .select({ workerId: advanceRequestTable.workerId })
        .from(advanceRequestTable)
        .where(eq(advanceRequestTable.id, id))
        .limit(1);
    const oldWorkerId = existing?.workerId ?? null;

    const now = new Date();

    try {
        await db.transaction(async (tx) => {
            await tx
                .update(advanceRequestTable)
                .set({
                    workerId: parsed.workerId,
                    requestDate: parsed.requestDate,
                    amountRequested: parsed.amountRequested,
                    purpose: input.purpose?.trim() || null,
                    employeeSignature: input.employeeSignature?.trim() || null,
                    employeeSignatureDate: parsed.employeeSignatureDate,
                    managerSignature: input.managerSignature?.trim() || null,
                    managerSignatureDate: parsed.managerSignatureDate,
                    updatedAt: now,
                })
                .where(eq(advanceRequestTable.id, id));

            await tx
                .delete(advanceTable)
                .where(eq(advanceTable.advanceRequestId, id));

            const advanceInserts: InsertAdvance[] = parsed.validInstallments.map(
                (inst) => ({
                    advanceRequestId: id,
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
            workerId: parsed.workerId,
        });
        if ("error" in sync) {
            return { success: false, error: sync.error };
        }

        if (oldWorkerId && oldWorkerId !== parsed.workerId) {
            const oldSync = await synchronizeWorkerDraftPayrolls({
                workerId: oldWorkerId,
            });
            if ("error" in oldSync) {
                return { success: false, error: oldSync.error };
            }
        }

        return { success: true, id };
    } catch (error) {
        console.error("Error updating advance request", error);
        return { success: false, error: "Failed to update advance request" };
    }
}
