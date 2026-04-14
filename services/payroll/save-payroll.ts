import { and, eq, gte, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import { getAdvancesForPayrollPeriod } from "@/utils/advance/queries";
import { payrollTable } from "@/db/tables/payroll/payrollTable";
import { payrollVoucherTable } from "@/db/tables/payroll/payrollVoucherTable";
import { timesheetTable } from "@/db/tables/payroll/timesheetTable";
import { employmentTable } from "@/db/tables/payroll/employmentTable";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { calculatePay } from "@/utils/payroll/payroll-utils";
import {
    findPayrollPeriodConflicts,
    type PayrollPeriodConflict,
    validatePayrollPeriodRange,
} from "@/utils/payroll/payroll-period-conflicts";
import {
    countMissingTimesheetDateIns,
    restDaysFromMissingDateCount,
} from "@/utils/payroll/missing-timesheet-dates";

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
    const missingCount = countMissingTimesheetDateIns({
        periodStart,
        periodEnd,
        presentDateInKeys: entries.map((e) => e.dateIn),
    });
    const restDays = restDaysFromMissingDateCount(missingCount);
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

export async function createPayrollRecord(input: {
    workerId: string;
    periodStart: string;
    periodEnd: string;
    payrollDate: string;
}): Promise<CreatePayrollResult> {
    const workerId = input.workerId.trim();
    const periodStart = input.periodStart.trim();
    const periodEnd = input.periodEnd.trim();
    const payrollDate = input.payrollDate.trim();

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
                employment: row.employment,
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

    return { success: true };
}

export async function createPayrollRecords(input: {
    workerIds: string[];
    periodStart: string;
    periodEnd: string;
    payrollDate: string;
}): Promise<CreatePayrollsResult> {
    const periodStart = input.periodStart.trim();
    const periodEnd = input.periodEnd.trim();
    const payrollDate = input.payrollDate.trim();

    if (
        input.workerIds.length === 0 ||
        !periodStart ||
        !periodEnd ||
        !payrollDate
    ) {
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
        new Set(input.workerIds.filter((workerId) => Boolean(workerId))),
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
                    employment: row.employment,
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

    return {
        success: true,
        created,
        skipped,
        conflicts: dedupePayrollPeriodConflicts(conflicts),
    };
}

export async function updatePayrollRecord(input: {
    payrollId: string;
    periodStart: string;
    periodEnd: string;
    payrollDate: string;
}): Promise<UpdatePayrollResult> {
    const payrollId = input.payrollId.trim();
    const periodStart = input.periodStart.trim();
    const periodEnd = input.periodEnd.trim();
    const payrollDate = input.payrollDate.trim();

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
    if (existing.status !== "Draft") {
        return { error: "Only Draft payrolls can be edited" };
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
        .where(eq(workerTable.id, existing.workerId))
        .limit(1);

    if (!row) return { error: "Worker not found" };

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

    const totalHoursWorked = entries.reduce((sum, e) => sum + Number(e.hours), 0);
    const [currentVoucher] = await db
        .select({
            publicHolidays: payrollVoucherTable.publicHolidays,
        })
        .from(payrollVoucherTable)
        .where(eq(payrollVoucherTable.id, existing.payrollVoucherId))
        .limit(1);

    const missingCount = countMissingTimesheetDateIns({
        periodStart,
        periodEnd,
        presentDateInKeys: entries.map((e) => e.dateIn),
    });
    const restDays = restDaysFromMissingDateCount(missingCount);
    const publicHolidays = currentVoucher?.publicHolidays ?? 0;
    const payCalc = calculatePay({
        employmentType: row.employment.employmentType,
        totalHoursWorked,
        minimumWorkingHours: row.employment.minimumWorkingHours,
        monthlyPay: row.employment.monthlyPay,
        hourlyRate: row.employment.hourlyRate,
        restDayRate: row.employment.restDayRate,
        restDays,
        publicHolidays,
    });
    const hoursNotMet =
        row.employment.minimumWorkingHours != null
            ? clampHoursNotMet(
                  roundHours(
                      totalHoursWorked - row.employment.minimumWorkingHours,
                  ),
              )
            : null;
    const hoursNotMetDeduction = calcHoursNotMetDeduction({
        hoursNotMet,
        hourlyRate: row.employment.hourlyRate,
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
        cpf: row.employment.cpf,
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
                    employmentType: row.employment.employmentType,
                    employmentArrangement: row.employment.employmentArrangement,
                    monthlyPay: row.employment.monthlyPay,
                    minimumWorkingHours: row.employment.minimumWorkingHours,
                    totalHoursWorked,
                    hoursNotMet,
                    hoursNotMetDeduction,
                    overtimeHours: payCalc.overtimeHours,
                    hourlyRate: row.employment.hourlyRate,
                    overtimePay: payCalc.overtimePay,
                    restDayRate: row.employment.restDayRate,
                    restDays,
                    restDayPay: payCalc.restDayPay,
                    publicHolidayPay: payCalc.publicHolidayPay,
                    cpf: row.employment.cpf,
                    advance: advanceTotal,
                    totalPay,
                    netPay,
                    paymentMethod: row.employment.paymentMethod,
                    payNowPhone: row.employment.payNowPhone,
                    bankAccountNumber: row.employment.bankAccountNumber,
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

    return { success: true };
}
