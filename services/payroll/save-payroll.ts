import { and, eq, gte, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import { getAdvancesForPayrollPeriod } from "@/utils/advance/queries";
import { payrollTable } from "@/db/tables/payrollTable";
import { payrollVoucherTable } from "@/db/tables/payrollVoucherTable";
import { timesheetTable } from "@/db/tables/timesheetTable";
import { employmentTable } from "@/db/tables/employmentTable";
import { workerTable } from "@/db/tables/workerTable";
import {
    findPayrollPeriodConflicts,
    type PayrollPeriodConflict,
    validatePayrollPeriodRange,
} from "@/utils/payroll/payroll-period-conflicts";
import { computeRestDaysForPayrollPeriod } from "@/utils/payroll/missing-timesheet-dates";
import { countPayrollPublicHolidays } from "@/services/payroll/public-holiday-payroll";
import { buildDraftPayrollVoucherValues } from "@/services/payroll/draft-payroll-voucher-values";
import { generateVoucherNumber } from "@/services/payroll/generate-voucher-number";
import { recordGuidedMonthlyWorkflowStepCompletion } from "@/services/payroll/guided-monthly-workflow-activity";
import { assertWorkerEligibleForPayroll } from "@/services/worker/assert-worker-eligible-for-payroll";

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

export type CreatedPayrollSummary = {
    payrollId: string;
    workerId: string;
};

export type CreatePayrollsResult =
    | { error: string }
    | {
          success: true;
          created: number;
          skipped: number;
          conflicts: PayrollPeriodConflict[];
          /** New payroll rows in batch iteration order (for client PDF generation). */
          createdPayrolls: CreatedPayrollSummary[];
      };

export type UpdatePayrollResult =
    | { success: true }
    | { error: string }
    | PayrollOverlapErrorResult;

type PgDatabaseError = {
    code?: string;
    constraint?: string;
};

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

type DraftVoucherInputsExecutor = Pick<typeof db, "select">;

async function fetchWorkerWithEmployment(workerId: string) {
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
    return row ?? null;
}

async function computeDraftVoucherInputs(
    executor: DraftVoucherInputsExecutor,
    input: {
        workerId: string;
        periodStart: string;
        periodEnd: string;
        employment: typeof employmentTable.$inferSelect;
    },
) {
    const { workerId, periodStart, periodEnd, employment } = input;

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
    const restDays = computeRestDaysForPayrollPeriod({
        periodStart,
        periodEnd,
        presentDateInKeys: entries.map((e) => e.dateIn),
    });
    const publicHolidays = await countPayrollPublicHolidays(
        {
            periodStart,
            periodEnd,
            workedDateIns: entries.map((entry) => entry.dateIn),
        },
        executor,
    );
    const advances = await getAdvancesForPayrollPeriod(
        workerId,
        periodStart,
        periodEnd,
    );
    const advanceTotal = advances
        .filter((advance) => advance.status === "Installment Loan")
        .reduce((sum, advance) => sum + advance.amount, 0);

    return buildDraftPayrollVoucherValues({
        employment,
        totalHoursWorked,
        restDays,
        publicHolidays,
        advanceTotal,
    });
}

async function recordPayrollCreationWorkflowCompletion() {
    try {
        await recordGuidedMonthlyWorkflowStepCompletion({
            stepId: "payroll_creation",
        });
    } catch (error) {
        console.error(
            "Failed to record guided monthly workflow completion for payroll creation",
            error,
        );
    }
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
): Promise<string> {
    const { workerId, employment, periodStart, periodEnd, payrollDate } = input;
    const voucherYear = Number.parseInt(payrollDate.slice(0, 4), 10);

    if (Number.isNaN(voucherYear)) {
        throw new Error(`Invalid payroll date for voucher numbering: ${payrollDate}`);
    }

    const voucherValues = await computeDraftVoucherInputs(executor, {
        workerId,
        periodStart,
        periodEnd,
        employment,
    });
    const [voucher] = await executor
        .insert(payrollVoucherTable)
        .values({
            voucherNumber: await generateVoucherNumber(voucherYear, executor),
            ...voucherValues,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
        .returning({ id: payrollVoucherTable.id });

    const [payroll] = await executor
        .insert(payrollTable)
        .values({
            workerId,
            payrollVoucherId: voucher!.id,
            periodStart,
            periodEnd,
            payrollDate,
            status: "Draft",
            createdAt: new Date(),
            updatedAt: new Date(),
        })
        .returning({ id: payrollTable.id });

    return payroll!.id;
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
        payrollDate,
    });
    if ("error" in rangeValidation) {
        return { error: rangeValidation.error };
    }

    const row = await fetchWorkerWithEmployment(workerId);

    if (!row) {
        return { error: "Worker not found" };
    }

    const eligibility = assertWorkerEligibleForPayroll(row.worker);
    if ("error" in eligibility) {
        return { error: eligibility.error };
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

    await recordPayrollCreationWorkflowCompletion();
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
        payrollDate,
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
    const createdPayrolls: CreatedPayrollSummary[] = [];

    for (const workerId of uniqueWorkerIds) {
        const row = await fetchWorkerWithEmployment(workerId);

        if (!row) continue;

        const eligibility = assertWorkerEligibleForPayroll(row.worker);
        if ("error" in eligibility) {
            return { error: eligibility.error };
        }

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
            const payrollId = await db.transaction(async (tx) =>
                createPayrollForWorkerInExecutor(tx, {
                    workerId,
                    employment: row.employment,
                    periodStart,
                    periodEnd,
                    payrollDate,
                }),
            );
            createdPayrolls.push({ payrollId, workerId });
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
        await recordPayrollCreationWorkflowCompletion();
    }

    return {
        success: true,
        created,
        skipped,
        conflicts: dedupePayrollPeriodConflicts(conflicts),
        createdPayrolls,
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
        payrollDate,
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

    const row = await fetchWorkerWithEmployment(existing.workerId);

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

    const voucherValues = await computeDraftVoucherInputs(db, {
        workerId: existing.workerId,
        periodStart,
        periodEnd,
        employment: row.employment,
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
                    ...voucherValues,
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
