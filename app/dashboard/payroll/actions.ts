"use server";

import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getAdvancesForPayrollPeriod } from "@/utils/advance/queries";
import { db } from "@/lib/db";
import {
    synchronizeWorkerDraftPayrolls,
    synchronizeWorkerDraftPayrollsInTx,
} from "@/services/payroll/synchronize-worker-draft-payrolls";
import { payrollTable } from "@/db/tables/payroll/payrollTable";
import { payrollVoucherTable } from "@/db/tables/payroll/payrollVoucherTable";
import { timesheetTable } from "@/db/tables/payroll/timesheetTable";
import { employmentTable } from "@/db/tables/payroll/employmentTable";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { advanceTable } from "@/db/tables/payroll/advanceTable";
import { advanceRequestTable } from "@/db/tables/payroll/advanceRequestTable";
import { calculatePay, type PayCalcInput } from "@/utils/payroll/payroll-utils";
import {
    findPayrollPeriodConflicts,
    type PayrollPeriodConflict,
    validatePayrollPeriodRange,
} from "@/utils/payroll/payroll-period-conflicts";
import { requirePermission } from "@/utils/permissions/require-permission";
import {
    getPayrollRevertPreview,
    type RevertPreviewAdvanceInstallmentLine,
    type RevertPreviewRow,
    type RevertPreviewTimesheetLine,
} from "@/services/payroll/get-revert-preview";
import { listDraftPayrollsForSettlement } from "@/services/payroll/list-draft-payrolls-for-settlement";
import { listPayrollsForDownload } from "@/services/payroll/list-payrolls-for-download";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type CreatePayrollExecutor = Pick<DbTransaction, "select" | "insert">;

const PAYROLL_PERIOD_OVERLAP_CONSTRAINT = "payroll_worker_period_overlap_excl";

export type PayrollOverlapErrorResult = {
    error: string;
    code: "OVERLAP_CONFLICT";
    conflicts: PayrollPeriodConflict[];
};

export type CreatePayrollResult =
    | { success: true }
    | { error: string }
    | PayrollOverlapErrorResult;

export type CreatePayrollsResult =
    | { error: string }
    | {
          success: true;
          created: number;
          skipped: number;
          conflicts: PayrollPeriodConflict[];
      };

export type UpdatePayrollResult =
    | { success: true }
    | { error: string }
    | PayrollOverlapErrorResult;

type PgDatabaseError = {
    code?: string;
    constraint?: string;
};

function generateVoucherNumber(): number {
    return parseInt(crypto.randomUUID().slice(0, 8), 16);
}

function roundHours(n: number): number {
    return Math.round(n * 100) / 100;
}

function roundMoney(n: number): number {
    return Math.round(n * 100) / 100;
}

function clampHoursNotMet(hoursNotMet: number): number {
    return hoursNotMet > 0 ? 0 : hoursNotMet;
}

function calcHoursNotMetDeduction(args: {
    hoursNotMet: number | null;
    hourlyRate: number | null;
}): number {
    const { hoursNotMet, hourlyRate } = args;
    if (hoursNotMet == null) return 0;
    if (hoursNotMet === 0) return 0;
    return -roundMoney(Math.max(0, -hoursNotMet) * (hourlyRate ?? 0));
}

function calcNetPay(args: {
    totalPay: number;
    cpf: number | null;
    advance?: number | null;
}): number {
    return roundMoney(args.totalPay - (args.cpf ?? 0) - (args.advance ?? 0));
}

function toDateString(val: string): string {
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
}

function dedupePayrollPeriodConflicts(
    conflicts: PayrollPeriodConflict[],
): PayrollPeriodConflict[] {
    const seen = new Set<string>();
    const unique: PayrollPeriodConflict[] = [];
    for (const conflict of conflicts) {
        const key = `${conflict.payrollId}:${conflict.workerId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(conflict);
    }
    return unique;
}

function buildPayrollOverlapErrorResult(
    conflicts: PayrollPeriodConflict[],
): PayrollOverlapErrorResult {
    const uniqueConflicts = dedupePayrollPeriodConflicts(conflicts);
    const first = uniqueConflicts[0];
    const error = first
        ? `Payroll period overlaps with existing payroll for ${first.workerName} (${first.periodStart} to ${first.periodEnd})`
        : "Payroll period overlaps with existing payroll";
    return {
        error,
        code: "OVERLAP_CONFLICT",
        conflicts: uniqueConflicts,
    };
}

function isPayrollOverlapConstraintError(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    const dbError = error as PgDatabaseError;
    if (dbError.code !== "23P01") return false;
    if (!dbError.constraint) return true;
    return dbError.constraint === PAYROLL_PERIOD_OVERLAP_CONSTRAINT;
}

async function createPayrollForWorkerInExecutor(
    executor: CreatePayrollExecutor,
    input: {
        workerId: string;
        employment: typeof employmentTable.$inferSelect;
        periodStart: string;
        periodEnd: string;
        payrollDate: string;
    },
) {
    const { workerId, employment, periodStart, periodEnd, payrollDate } = input;

    const entries = await executor
        .select()
        .from(timesheetTable)
        .where(
            and(
                eq(timesheetTable.workerId, workerId),
                gte(timesheetTable.dateIn, periodStart),
                lte(timesheetTable.dateOut, periodEnd),
            ),
        );

    const totalHoursWorked = entries.reduce(
        (sum, entry) => sum + Number(entry.hours),
        0,
    );
    const restDays = 4;
    const publicHolidays = 0;
    const payCalc = calculatePay({
        employmentType: employment.employmentType,
        totalHoursWorked,
        minimumWorkingHours: employment.minimumWorkingHours,
        monthlyPay: employment.monthlyPay,
        hourlyRate: employment.hourlyRate,
        restDayRate: employment.restDayRate,
        restDays,
        publicHolidays,
    });
    const hoursNotMet =
        employment.minimumWorkingHours != null
            ? clampHoursNotMet(
                  roundHours(totalHoursWorked - employment.minimumWorkingHours),
              )
            : null;
    const hoursNotMetDeduction = calcHoursNotMetDeduction({
        hoursNotMet,
        hourlyRate: employment.hourlyRate,
    });
    const totalPay = roundMoney(payCalc.totalPay + hoursNotMetDeduction);
    const advances = await getAdvancesForPayrollPeriod(
        workerId,
        periodStart,
        periodEnd,
    );
    const advanceTotal = advances
        .filter((advance) => advance.status === "Installment Loan")
        .reduce((sum, advance) => sum + advance.amount, 0);
    const netPay = calcNetPay({
        totalPay,
        cpf: employment.cpf,
        advance: advanceTotal,
    });

    const [voucher] = await executor
        .insert(payrollVoucherTable)
        .values({
            voucherNumber: generateVoucherNumber(),
            employmentType: employment.employmentType,
            employmentArrangement: employment.employmentArrangement,
            monthlyPay: employment.monthlyPay,
            minimumWorkingHours: employment.minimumWorkingHours,
            totalHoursWorked,
            hoursNotMet,
            hoursNotMetDeduction,
            overtimeHours: payCalc.overtimeHours,
            hourlyRate: employment.hourlyRate,
            overtimePay: payCalc.overtimePay,
            restDays,
            restDayRate: employment.restDayRate,
            restDayPay: payCalc.restDayPay,
            publicHolidays,
            publicHolidayPay: payCalc.publicHolidayPay,
            cpf: employment.cpf,
            advance: advanceTotal,
            totalPay,
            netPay,
            paymentMethod: employment.paymentMethod,
            payNowPhone: employment.payNowPhone,
            bankAccountNumber: employment.bankAccountNumber,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
        .returning({ id: payrollVoucherTable.id });

    await executor.insert(payrollTable).values({
        workerId,
        payrollVoucherId: voucher!.id,
        periodStart,
        periodEnd,
        payrollDate,
        status: "Draft",
        createdAt: new Date(),
        updatedAt: new Date(),
    });
}

export async function createPayroll(
    formData: FormData,
): Promise<CreatePayrollResult> {
    const workerId = formData.get("workerId") as string;
    const periodStart = toDateString(formData.get("periodStart") as string);
    const periodEnd = toDateString(formData.get("periodEnd") as string);
    const payrollDate = toDateString(formData.get("payrollDate") as string);

    if (!workerId || !periodStart || !periodEnd || !payrollDate) {
        return { error: "Missing required fields" };
    }

    const rangeValidation = validatePayrollPeriodRange({
        periodStart,
        periodEnd,
    });
    if ("error" in rangeValidation) {
        return { error: rangeValidation.error };
    }

    const [row] = await db
        .select({
            worker: workerTable,
            employment: employmentTable,
        })
        .from(workerTable)
        .innerJoin(
            employmentTable,
            eq(workerTable.employmentId, employmentTable.id),
        )
        .where(eq(workerTable.id, workerId))
        .limit(1);

    if (!row) {
        return { error: "Worker not found" };
    }
    const { employment } = row;

    const conflicts = await findPayrollPeriodConflicts(db, {
        workerId,
        periodStart,
        periodEnd,
    });
    if (conflicts.length > 0) {
        return buildPayrollOverlapErrorResult(conflicts);
    }

    try {
        await db.transaction(async (tx) => {
            await createPayrollForWorkerInExecutor(tx, {
                workerId,
                employment,
                periodStart,
                periodEnd,
                payrollDate,
            });
        });
    } catch (error) {
        if (isPayrollOverlapConstraintError(error)) {
            const latestConflicts = await findPayrollPeriodConflicts(db, {
                workerId,
                periodStart,
                periodEnd,
            });
            return buildPayrollOverlapErrorResult(latestConflicts);
        }

        console.error("Error creating payroll", error);
        return { error: "Failed to create payroll" };
    }

    revalidatePath("/dashboard/payroll");
    revalidatePath("/dashboard/payroll/all");
    return { success: true };
}

export async function createPayrolls(
    formData: FormData,
): Promise<CreatePayrollsResult> {
    const workerIds = formData.getAll("workerId") as string[];
    const periodStart = toDateString(formData.get("periodStart") as string);
    const periodEnd = toDateString(formData.get("periodEnd") as string);
    const payrollDate = toDateString(formData.get("payrollDate") as string);

    if (workerIds.length === 0 || !periodStart || !periodEnd || !payrollDate) {
        return { error: "Select at least one worker and fill in period dates" };
    }

    const rangeValidation = validatePayrollPeriodRange({
        periodStart,
        periodEnd,
    });
    if ("error" in rangeValidation) {
        return { error: rangeValidation.error };
    }

    const uniqueWorkerIds = Array.from(
        new Set(workerIds.filter((workerId) => Boolean(workerId))),
    );

    let created = 0;
    let skipped = 0;
    const conflicts: PayrollPeriodConflict[] = [];

    for (const workerId of uniqueWorkerIds) {
        const [row] = await db
            .select({
                worker: workerTable,
                employment: employmentTable,
            })
            .from(workerTable)
            .innerJoin(
                employmentTable,
                eq(workerTable.employmentId, employmentTable.id),
            )
            .where(eq(workerTable.id, workerId))
            .limit(1);

        if (!row) continue;
        const { employment } = row;

        const preConflicts = await findPayrollPeriodConflicts(db, {
            workerId,
            periodStart,
            periodEnd,
        });
        if (preConflicts.length > 0) {
            conflicts.push(...preConflicts);
            skipped++;
            continue;
        }

        try {
            await db.transaction(async (tx) => {
                await createPayrollForWorkerInExecutor(tx, {
                    workerId,
                    employment,
                    periodStart,
                    periodEnd,
                    payrollDate,
                });
            });
            created++;
        } catch (error) {
            if (isPayrollOverlapConstraintError(error)) {
                const latestConflicts = await findPayrollPeriodConflicts(db, {
                    workerId,
                    periodStart,
                    periodEnd,
                });
                conflicts.push(...latestConflicts);
                skipped++;
                continue;
            }

            console.error("Error creating payrolls", error);
            return { error: "Failed to create payrolls" };
        }
    }

    if (created > 0) {
        revalidatePath("/dashboard/payroll");
        revalidatePath("/dashboard/payroll/all");
    }

    return {
        success: true,
        created,
        skipped,
        conflicts: dedupePayrollPeriodConflicts(conflicts),
    };
}

export async function updatePayroll(
    payrollId: string,
    formData: FormData,
): Promise<UpdatePayrollResult> {
    const periodStart = toDateString(formData.get("periodStart") as string);
    const periodEnd = toDateString(formData.get("periodEnd") as string);
    const payrollDate = toDateString(formData.get("payrollDate") as string);

    if (!periodStart || !periodEnd || !payrollDate) {
        return { error: "Missing required fields" };
    }

    const rangeValidation = validatePayrollPeriodRange({
        periodStart,
        periodEnd,
    });
    if ("error" in rangeValidation) {
        return { error: rangeValidation.error };
    }

    const [existing] = await db
        .select()
        .from(payrollTable)
        .where(eq(payrollTable.id, payrollId))
        .limit(1);

    if (!existing) return { error: "Payroll not found" };
    if (existing.status !== "Draft")
        return { error: "Only Draft payrolls can be edited" };

    const [row] = await db
        .select({
            worker: workerTable,
            employment: employmentTable,
        })
        .from(workerTable)
        .innerJoin(
            employmentTable,
            eq(workerTable.employmentId, employmentTable.id),
        )
        .where(eq(workerTable.id, existing.workerId))
        .limit(1);

    if (!row) return { error: "Worker not found" };
    const { employment } = row;

    const preConflicts = await findPayrollPeriodConflicts(db, {
        workerId: existing.workerId,
        periodStart,
        periodEnd,
        excludePayrollId: payrollId,
    });
    if (preConflicts.length > 0) {
        return buildPayrollOverlapErrorResult(preConflicts);
    }

    const entries = await db
        .select()
        .from(timesheetTable)
        .where(
            and(
                eq(timesheetTable.workerId, existing.workerId),
                gte(timesheetTable.dateIn, periodStart),
                lte(timesheetTable.dateOut, periodEnd),
            ),
        );

    const totalHoursWorked = entries.reduce(
        (sum, e) => sum + Number(e.hours),
        0,
    );
    const [currentVoucher] = await db
        .select({
            restDays: payrollVoucherTable.restDays,
            publicHolidays: payrollVoucherTable.publicHolidays,
        })
        .from(payrollVoucherTable)
        .where(eq(payrollVoucherTable.id, existing.payrollVoucherId))
        .limit(1);

    const restDays = currentVoucher?.restDays ?? 0;
    const publicHolidays = currentVoucher?.publicHolidays ?? 0;
    const payCalc = calculatePay({
        employmentType: employment.employmentType,
        totalHoursWorked,
        minimumWorkingHours: employment.minimumWorkingHours,
        monthlyPay: employment.monthlyPay,
        hourlyRate: employment.hourlyRate,
        restDayRate: employment.restDayRate,
        restDays,
        publicHolidays,
    });
    const hoursNotMet =
        employment.minimumWorkingHours != null
            ? clampHoursNotMet(
                  roundHours(totalHoursWorked - employment.minimumWorkingHours),
              )
            : null;
    const hoursNotMetDeduction = calcHoursNotMetDeduction({
        hoursNotMet,
        hourlyRate: employment.hourlyRate,
    });
    const totalPay = roundMoney(payCalc.totalPay + hoursNotMetDeduction);
    const advances = await getAdvancesForPayrollPeriod(
        existing.workerId,
        periodStart,
        periodEnd,
    );
    const advanceTotal = advances
        .filter((a) => a.status === "Installment Loan")
        .reduce((sum, a) => sum + a.amount, 0);
    const netPay = calcNetPay({
        totalPay,
        cpf: employment.cpf,
        advance: advanceTotal,
    });

    try {
        await db.transaction(async (tx) => {
            await tx
                .update(payrollTable)
                .set({
                    periodStart,
                    periodEnd,
                    payrollDate,
                    updatedAt: new Date(),
                })
                .where(eq(payrollTable.id, payrollId));

            await tx
                .update(payrollVoucherTable)
                .set({
                    employmentType: employment.employmentType,
                    employmentArrangement: employment.employmentArrangement,
                    monthlyPay: employment.monthlyPay,
                    minimumWorkingHours: employment.minimumWorkingHours,
                    totalHoursWorked,
                    hoursNotMet,
                    hoursNotMetDeduction,
                    overtimeHours: payCalc.overtimeHours,
                    hourlyRate: employment.hourlyRate,
                    overtimePay: payCalc.overtimePay,
                    restDayRate: employment.restDayRate,
                    restDayPay: payCalc.restDayPay,
                    publicHolidayPay: payCalc.publicHolidayPay,
                    cpf: employment.cpf,
                    advance: advanceTotal,
                    totalPay,
                    netPay,
                    paymentMethod: employment.paymentMethod,
                    payNowPhone: employment.payNowPhone,
                    bankAccountNumber: employment.bankAccountNumber,
                    updatedAt: new Date(),
                })
                .where(eq(payrollVoucherTable.id, existing.payrollVoucherId));
        });
    } catch (error) {
        if (isPayrollOverlapConstraintError(error)) {
            const latestConflicts = await findPayrollPeriodConflicts(db, {
                workerId: existing.workerId,
                periodStart,
                periodEnd,
                excludePayrollId: payrollId,
            });
            return buildPayrollOverlapErrorResult(latestConflicts);
        }

        console.error("Error updating payroll", error);
        return { error: "Failed to update payroll" };
    }

    revalidatePath(`/dashboard/payroll/${payrollId}/breakdown`);
    revalidatePath(`/dashboard/payroll/${payrollId}/summary`);
    revalidatePath("/dashboard/payroll");
    revalidatePath("/dashboard/payroll/all");
    return { success: true };
}

async function settlePayrollInTx(
    tx: DbTransaction,
    payroll: {
        id: string;
        workerId: string;
        periodStart: string;
        periodEnd: string;
    },
    now: Date,
) {
    type AdvanceInPeriodRow = {
        id: string;
        advanceRequestId: string;
        status: "Installment Loan" | "Installment Paid";
    };
    type RequestAdvanceRow = {
        advanceRequestId: string;
        status: "Installment Loan" | "Installment Paid";
    };

    await tx
        .update(payrollTable)
        .set({
            status: "Settled",
            updatedAt: now,
        })
        .where(eq(payrollTable.id, payroll.id));

    const advancesInPeriod: AdvanceInPeriodRow[] = await tx
        .select({
            id: advanceTable.id,
            advanceRequestId: advanceTable.advanceRequestId,
            status: advanceTable.status,
        })
        .from(advanceTable)
        .innerJoin(
            advanceRequestTable,
            eq(advanceTable.advanceRequestId, advanceRequestTable.id),
        )
        .where(
            and(
                eq(advanceRequestTable.workerId, payroll.workerId),
                gte(advanceTable.repaymentDate, payroll.periodStart),
                lte(advanceTable.repaymentDate, payroll.periodEnd),
            ),
        );

    const installmentLoanIds = advancesInPeriod
        .filter((advance) => advance.status === "Installment Loan")
        .map((advance) => advance.id);

    if (installmentLoanIds.length > 0) {
        await tx
            .update(advanceTable)
            .set({
                status: "Installment Paid",
                updatedAt: now,
            })
            .where(inArray(advanceTable.id, installmentLoanIds));
    }

    const requestIds: string[] = Array.from(
        new Set(advancesInPeriod.map((advance) => advance.advanceRequestId)),
    );

    if (requestIds.length > 0) {
        const requestAdvances: RequestAdvanceRow[] = await tx
            .select({
                advanceRequestId: advanceTable.advanceRequestId,
                status: advanceTable.status,
            })
            .from(advanceTable)
            .where(inArray(advanceTable.advanceRequestId, requestIds));

        const byRequestId = requestAdvances.reduce(
            (acc, row) => {
                if (!acc[row.advanceRequestId]) acc[row.advanceRequestId] = [];
                acc[row.advanceRequestId]!.push({ status: row.status });
                return acc;
            },
            {} as Record<
                string,
                Array<{ status: "Installment Loan" | "Installment Paid" }>
            >,
        );

        const fullyPaidRequestIds = requestIds.filter((requestId: string) => {
            const advances = byRequestId[requestId] ?? [];
            return (
                advances.length > 0 &&
                advances.every((a) => a.status === "Installment Paid")
            );
        });

        const notFullyPaidRequestIds = requestIds.filter(
            (requestId: string) => !fullyPaidRequestIds.includes(requestId),
        );

        if (fullyPaidRequestIds.length > 0) {
            await tx
                .update(advanceRequestTable)
                .set({
                    status: "Advance Paid",
                    updatedAt: now,
                })
                .where(inArray(advanceRequestTable.id, fullyPaidRequestIds));
        }

        if (notFullyPaidRequestIds.length > 0) {
            await tx
                .update(advanceRequestTable)
                .set({
                    status: "Advance Loan",
                    updatedAt: now,
                })
                .where(inArray(advanceRequestTable.id, notFullyPaidRequestIds));
        }
    }

    await tx
        .update(timesheetTable)
        .set({
            status: "Timesheet Paid",
            updatedAt: now,
        })
        .where(
            and(
                eq(timesheetTable.workerId, payroll.workerId),
                gte(timesheetTable.dateIn, payroll.periodStart),
                lte(timesheetTable.dateOut, payroll.periodEnd),
                eq(timesheetTable.status, "Timesheet Unpaid"),
            ),
        );
}

export async function settlePayroll(payrollId: string) {
    await requirePermission("Payroll", "update");

    const [payroll] = await db
        .select()
        .from(payrollTable)
        .where(eq(payrollTable.id, payrollId))
        .limit(1);

    if (!payroll) return { error: "Payroll not found" };
    if (payroll.status !== "Draft") {
        return { error: "Only Draft payrolls can be settled" };
    }

    const now = new Date();

    try {
        await db.transaction(async (tx) => {
            await settlePayrollInTx(tx, payroll, now);
        });
    } catch (error) {
        console.error("Error settling payroll", error);
        return { error: "Failed to settle payroll" };
    }

    revalidatePath(`/dashboard/payroll/${payrollId}/breakdown`);
    revalidatePath(`/dashboard/payroll/${payrollId}/summary`);
    revalidatePath("/dashboard/payroll");
    revalidatePath("/dashboard/payroll/all");
    revalidatePath("/dashboard/advance");
    revalidatePath("/dashboard/advance/all");
    revalidatePath("/dashboard/timesheet");
    revalidatePath("/dashboard/timesheet/all");
    return { success: true };
}

async function revertPayrollInTx(
    tx: DbTransaction,
    payroll: {
        id: string;
        workerId: string;
        periodStart: string;
        periodEnd: string;
    },
    now: Date,
) {
    type AdvanceInPeriodRow = {
        id: string;
        advanceRequestId: string;
        status: "Installment Loan" | "Installment Paid";
    };
    type RequestAdvanceRow = {
        advanceRequestId: string;
        status: "Installment Loan" | "Installment Paid";
    };

    await tx
        .update(payrollTable)
        .set({
            status: "Draft",
            updatedAt: now,
        })
        .where(eq(payrollTable.id, payroll.id));

    const advancesInPeriod: AdvanceInPeriodRow[] = await tx
        .select({
            id: advanceTable.id,
            advanceRequestId: advanceTable.advanceRequestId,
            status: advanceTable.status,
        })
        .from(advanceTable)
        .innerJoin(
            advanceRequestTable,
            eq(advanceTable.advanceRequestId, advanceRequestTable.id),
        )
        .where(
            and(
                eq(advanceRequestTable.workerId, payroll.workerId),
                gte(advanceTable.repaymentDate, payroll.periodStart),
                lte(advanceTable.repaymentDate, payroll.periodEnd),
            ),
        );

    const installmentPaidIds = advancesInPeriod
        .filter((advance) => advance.status === "Installment Paid")
        .map((advance) => advance.id);

    if (installmentPaidIds.length > 0) {
        await tx
            .update(advanceTable)
            .set({
                status: "Installment Loan",
                updatedAt: now,
            })
            .where(inArray(advanceTable.id, installmentPaidIds));
    }

    const requestIds: string[] = Array.from(
        new Set(advancesInPeriod.map((advance) => advance.advanceRequestId)),
    );

    if (requestIds.length > 0) {
        const requestAdvances: RequestAdvanceRow[] = await tx
            .select({
                advanceRequestId: advanceTable.advanceRequestId,
                status: advanceTable.status,
            })
            .from(advanceTable)
            .where(inArray(advanceTable.advanceRequestId, requestIds));

        const byRequestId = requestAdvances.reduce(
            (acc, row) => {
                if (!acc[row.advanceRequestId]) acc[row.advanceRequestId] = [];
                acc[row.advanceRequestId]!.push({ status: row.status });
                return acc;
            },
            {} as Record<
                string,
                Array<{ status: "Installment Loan" | "Installment Paid" }>
            >,
        );

        const fullyPaidRequestIds = requestIds.filter((requestId: string) => {
            const advances = byRequestId[requestId] ?? [];
            return (
                advances.length > 0 &&
                advances.every((a) => a.status === "Installment Paid")
            );
        });

        const notFullyPaidRequestIds = requestIds.filter(
            (requestId: string) => !fullyPaidRequestIds.includes(requestId),
        );

        if (fullyPaidRequestIds.length > 0) {
            await tx
                .update(advanceRequestTable)
                .set({
                    status: "Advance Paid",
                    updatedAt: now,
                })
                .where(inArray(advanceRequestTable.id, fullyPaidRequestIds));
        }

        if (notFullyPaidRequestIds.length > 0) {
            await tx
                .update(advanceRequestTable)
                .set({
                    status: "Advance Loan",
                    updatedAt: now,
                })
                .where(inArray(advanceRequestTable.id, notFullyPaidRequestIds));
        }
    }

    await tx
        .update(timesheetTable)
        .set({
            status: "Timesheet Unpaid",
            updatedAt: now,
        })
        .where(
            and(
                eq(timesheetTable.workerId, payroll.workerId),
                gte(timesheetTable.dateIn, payroll.periodStart),
                lte(timesheetTable.dateOut, payroll.periodEnd),
                eq(timesheetTable.status, "Timesheet Paid"),
            ),
        );
}

export async function revertPayroll(payrollId: string) {
    await requirePermission("Payroll", "update");

    const [payroll] = await db
        .select()
        .from(payrollTable)
        .where(eq(payrollTable.id, payrollId))
        .limit(1);

    if (!payroll) return { error: "Payroll not found" };
    if (payroll.status !== "Settled") {
        return { error: "Only Settled payrolls can be reverted" };
    }

    const now = new Date();

    try {
        await db.transaction(async (tx) => {
            await revertPayrollInTx(tx, payroll, now);
        });
    } catch (error) {
        console.error("Error reverting payroll", error);
        return { error: "Failed to revert payroll" };
    }

    revalidatePath(`/dashboard/payroll/${payrollId}/breakdown`);
    revalidatePath(`/dashboard/payroll/${payrollId}/summary`);
    revalidatePath("/dashboard/payroll");
    revalidatePath("/dashboard/payroll/all");
    revalidatePath("/dashboard/advance");
    revalidatePath("/dashboard/advance/all");
    revalidatePath("/dashboard/timesheet");
    revalidatePath("/dashboard/timesheet/all");
    return { success: true };
}

class SettleDraftPayrollsValidationError extends Error {
    readonly code: "NOT_FOUND" | "NOT_DRAFT";

    constructor(code: "NOT_FOUND" | "NOT_DRAFT") {
        super(code);
        this.code = code;
        this.name = "SettleDraftPayrollsValidationError";
    }
}

export async function settleDraftPayrolls(payrollIds: string[]) {
    await requirePermission("Payroll", "update");

    const uniqueIds = Array.from(new Set(payrollIds));
    if (uniqueIds.length === 0) {
        return { error: "Select at least one payroll to settle" };
    }

    const now = new Date();

    let settledPayrollIds: string[] = [];
    try {
        settledPayrollIds = await db.transaction(async (tx) => {
            const rows = await tx
                .select()
                .from(payrollTable)
                .where(inArray(payrollTable.id, uniqueIds));

            if (rows.length !== uniqueIds.length) {
                throw new SettleDraftPayrollsValidationError("NOT_FOUND");
            }
            if (rows.some((r) => r.status !== "Draft")) {
                throw new SettleDraftPayrollsValidationError("NOT_DRAFT");
            }

            const sorted = [...rows].sort((a, b) => a.id.localeCompare(b.id));
            for (const payroll of sorted) {
                await settlePayrollInTx(tx, payroll, now);
            }
            return sorted.map((p) => p.id);
        });
    } catch (error) {
        if (error instanceof SettleDraftPayrollsValidationError) {
            if (error.code === "NOT_FOUND") {
                return { error: "One or more payrolls were not found" };
            }
            return { error: "One or more payrolls are not drafts" };
        }
        console.error("Error settling Draft payrolls", error);
        return { error: "Failed to settle Draft payrolls" };
    }

    for (const payrollId of settledPayrollIds) {
        revalidatePath(`/dashboard/payroll/${payrollId}/breakdown`);
        revalidatePath(`/dashboard/payroll/${payrollId}/summary`);
    }

    revalidatePath("/dashboard/payroll");
    revalidatePath("/dashboard/payroll/all");
    revalidatePath("/dashboard/advance");
    revalidatePath("/dashboard/advance/all");
    revalidatePath("/dashboard/timesheet");
    revalidatePath("/dashboard/timesheet/all");

    return {
        success: true,
        settled: settledPayrollIds.length,
        settledPayrollIds,
    };
}

export async function getDraftPayrollsForSettlement() {
    await requirePermission("Payroll", "read");
    return listDraftPayrollsForSettlement();
}

export async function getAllPayrollsForDownload() {
    await requirePermission("Payroll", "read");
    return listPayrollsForDownload();
}

export async function updateVoucherDays(input: {
    payrollId: string;
    voucherId: string;
    restDays: number;
    publicHolidays: number;
}) {
    const { payrollId, voucherId, restDays, publicHolidays } = input;
    if (!voucherId || !payrollId)
        return { error: "Missing voucherId or payrollId" };
    if (!Number.isFinite(restDays) || restDays < 0)
        return { error: "Invalid restDays" };
    if (!Number.isFinite(publicHolidays) || publicHolidays < 0)
        return { error: "Invalid publicHolidays" };

    const [payrollRow] = await db
        .select({
            status: payrollTable.status,
            payrollVoucherId: payrollTable.payrollVoucherId,
        })
        .from(payrollTable)
        .where(eq(payrollTable.id, payrollId))
        .limit(1);

    if (!payrollRow) return { error: "Payroll not found" };
    if (payrollRow.payrollVoucherId !== voucherId) {
        return { error: "Voucher does not belong to this payroll" };
    }
    if (payrollRow.status !== "Draft") {
        return { error: "Only Draft payrolls can edit voucher days" };
    }

    const [voucher] = await db
        .select({
            employmentType: payrollVoucherTable.employmentType,
            totalHoursWorked: payrollVoucherTable.totalHoursWorked,
            minimumWorkingHours: payrollVoucherTable.minimumWorkingHours,
            monthlyPay: payrollVoucherTable.monthlyPay,
            hourlyRate: payrollVoucherTable.hourlyRate,
            restDayRate: payrollVoucherTable.restDayRate,
            cpf: payrollVoucherTable.cpf,
            advance: payrollVoucherTable.advance,
        })
        .from(payrollVoucherTable)
        .where(eq(payrollVoucherTable.id, voucherId))
        .limit(1);

    if (!voucher) return { error: "Voucher not found" };

    const totalHoursWorked = Number(voucher.totalHoursWorked ?? 0);
    const minimumWorkingHours =
        voucher.minimumWorkingHours != null
            ? Number(voucher.minimumWorkingHours)
            : null;

    const payCalc = calculatePay({
        employmentType: (voucher.employmentType ??
            "Full Time") as PayCalcInput["employmentType"],
        totalHoursWorked,
        minimumWorkingHours,
        monthlyPay:
            voucher.monthlyPay != null ? Number(voucher.monthlyPay) : null,
        hourlyRate:
            voucher.hourlyRate != null ? Number(voucher.hourlyRate) : null,
        restDayRate:
            voucher.restDayRate != null ? Number(voucher.restDayRate) : null,
        restDays,
        publicHolidays,
    });

    const hoursNotMet =
        minimumWorkingHours != null
            ? clampHoursNotMet(
                  roundHours(totalHoursWorked - minimumWorkingHours),
              )
            : null;
    const hoursNotMetDeduction = calcHoursNotMetDeduction({
        hoursNotMet,
        hourlyRate:
            voucher.hourlyRate != null ? Number(voucher.hourlyRate) : null,
    });
    const totalPay = roundMoney(payCalc.totalPay + hoursNotMetDeduction);
    const netPay = calcNetPay({
        totalPay,
        cpf: voucher.cpf != null ? Number(voucher.cpf) : null,
        advance: voucher.advance,
    });

    await db
        .update(payrollVoucherTable)
        .set({
            restDays,
            publicHolidays,
            hoursNotMet,
            hoursNotMetDeduction,
            overtimeHours: payCalc.overtimeHours,
            overtimePay: payCalc.overtimePay,
            restDayPay: payCalc.restDayPay,
            publicHolidayPay: payCalc.publicHolidayPay,
            totalPay,
            netPay,
            updatedAt: new Date(),
        })
        .where(eq(payrollVoucherTable.id, voucherId));

    revalidatePath(`/dashboard/payroll/${payrollId}/breakdown`);
    revalidatePath(`/dashboard/payroll/${payrollId}/summary`);
    revalidatePath("/dashboard/payroll");
    revalidatePath("/dashboard/payroll/all");
    return { success: true };
}

export async function getRevertPreview(
    payrollId: string,
): Promise<{ data: RevertPreviewRow[] } | { error: string }> {
    await requirePermission("Payroll", "read");
    const result = await getPayrollRevertPreview(payrollId);
    if ("error" in result) {
        return { error: result.error };
    }
    return result;
}

export {
    synchronizeWorkerDraftPayrolls,
    synchronizeWorkerDraftPayrollsInTx,
};
