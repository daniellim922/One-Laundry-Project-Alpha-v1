import { and, eq, gte, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import { advanceRequestTable } from "@/db/tables/advanceRequestTable";
import { advanceTable } from "@/db/tables/advanceTable";
import { employmentTable } from "@/db/tables/employmentTable";
import { payrollTable } from "@/db/tables/payrollTable";
import { payrollVoucherTable } from "@/db/tables/payrollVoucherTable";
import { timesheetTable } from "@/db/tables/timesheetTable";
import { workerTable } from "@/db/tables/workerTable";
import { calculatePay } from "@/utils/payroll/payroll-utils";
import {
    countMissingTimesheetDateIns,
    restDaysFromMissingDateCount,
} from "@/utils/payroll/missing-timesheet-dates";
import { countPayrollPublicHolidays } from "@/services/payroll/public-holiday-payroll";
import {
    calculateVoucherAmounts,
    clampHoursNotMet,
} from "@/services/payroll/payroll-voucher-amounts";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DraftPayrollRefreshExecutor = Pick<typeof db, "select" | "update">;

type DraftPayrollRow = Pick<
    typeof payrollTable.$inferSelect,
    "id" | "workerId" | "payrollVoucherId" | "periodStart" | "periodEnd"
>;

type DraftPayrollRefreshResult =
    | { success: true; affectedPayrollIds: string[] }
    | { error: string };

function yearRange(year: number) {
    return {
        start: `${year}-01-01`,
        end: `${year}-12-31`,
    };
}

function roundHours(n: number): number {
    return Math.round(n * 100) / 100;
}

async function refreshAffectedDraftPayrollsForPublicHolidayYearWithExecutor(
    executor: DraftPayrollRefreshExecutor,
    input: {
        year: number;
    },
): Promise<DraftPayrollRefreshResult> {
    const { start, end } = yearRange(input.year);

    try {
        const drafts = await executor
            .select({
                id: payrollTable.id,
                workerId: payrollTable.workerId,
                payrollVoucherId: payrollTable.payrollVoucherId,
                periodStart: payrollTable.periodStart,
                periodEnd: payrollTable.periodEnd,
            })
            .from(payrollTable)
            .where(
                and(
                    eq(payrollTable.status, "Draft"),
                    lte(payrollTable.periodStart, end),
                    gte(payrollTable.periodEnd, start),
                ),
            );

        if (drafts.length === 0) {
            return { success: true, affectedPayrollIds: [] };
        }

        const employmentByWorkerId = new Map<
            string,
            typeof employmentTable.$inferSelect
        >();

        for (const payroll of drafts) {
            let employment = employmentByWorkerId.get(payroll.workerId);
            if (!employment) {
                const [employmentRow] = await executor
                    .select({ employment: employmentTable })
                    .from(workerTable)
                    .innerJoin(
                        employmentTable,
                        eq(workerTable.employmentId, employmentTable.id),
                    )
                    .where(eq(workerTable.id, payroll.workerId))
                    .limit(1);

                employment = employmentRow?.employment;
                if (!employment) {
                    continue;
                }
                employmentByWorkerId.set(payroll.workerId, employment);
            }

            await refreshDraftPayrollVoucher(executor, payroll, employment);
        }

        return {
            success: true,
            affectedPayrollIds: drafts.map((payroll) => payroll.id),
        };
    } catch (error) {
        console.error(
            "Error refreshing affected Draft payrolls for public holiday year",
            error,
        );
        return { error: "Failed to refresh affected Draft payrolls" };
    }
}

async function refreshDraftPayrollVoucher(
    executor: DraftPayrollRefreshExecutor,
    payroll: DraftPayrollRow,
    employment: typeof employmentTable.$inferSelect,
) {
    const entryRows = await executor
        .select({
            hours: timesheetTable.hours,
            dateIn: timesheetTable.dateIn,
        })
        .from(timesheetTable)
        .where(
            and(
                eq(timesheetTable.workerId, payroll.workerId),
                gte(timesheetTable.dateIn, payroll.periodStart),
                lte(timesheetTable.dateOut, payroll.periodEnd),
            ),
        );

    const totalHoursWorked = entryRows.reduce(
        (sum, entry) => sum + Number(entry.hours),
        0,
    );
    const missingCount = countMissingTimesheetDateIns({
        periodStart: payroll.periodStart,
        periodEnd: payroll.periodEnd,
        presentDateInKeys: entryRows.map((entry) => entry.dateIn),
    });
    const restDays = restDaysFromMissingDateCount(missingCount);
    const publicHolidays = await countPayrollPublicHolidays(
        {
            periodStart: payroll.periodStart,
            periodEnd: payroll.periodEnd,
            workedDateIns: entryRows.map((entry) => entry.dateIn),
        },
        executor,
    );
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

    const advanceRows = await executor
        .select({
            amount: advanceTable.amount,
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
    const advanceTotal = advanceRows
        .filter((advance) => advance.status === "Installment Loan")
        .reduce((sum, advance) => sum + advance.amount, 0);
    const { hoursNotMetDeduction, subTotal, grandTotal } =
        calculateVoucherAmounts({
            hoursNotMet,
            hourlyRate: employment.hourlyRate,
            basePayTotal: payCalc.totalPay,
            cpf: employment.cpf,
            advance: advanceTotal,
        });
    await executor
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
            restDays,
            restDayPay: payCalc.restDayPay,
            publicHolidays,
            publicHolidayPay: payCalc.publicHolidayPay,
            cpf: employment.cpf,
            advance: advanceTotal,
            subTotal,
            grandTotal,
            paymentMethod: employment.paymentMethod,
            payNowPhone: employment.payNowPhone,
            bankAccountNumber: employment.bankAccountNumber,
            updatedAt: new Date(),
        })
        .where(eq(payrollVoucherTable.id, payroll.payrollVoucherId));
}

export async function refreshAffectedDraftPayrollsForPublicHolidayYear(input: {
    year: number;
}): Promise<DraftPayrollRefreshResult> {
    return refreshAffectedDraftPayrollsForPublicHolidayYearWithExecutor(
        db,
        input,
    );
}

export async function refreshAffectedDraftPayrollsForPublicHolidayYearInTx(
    tx: DbTransaction,
    input: {
        year: number;
    },
): Promise<DraftPayrollRefreshResult> {
    return refreshAffectedDraftPayrollsForPublicHolidayYearWithExecutor(
        tx as unknown as DraftPayrollRefreshExecutor,
        input,
    );
}
