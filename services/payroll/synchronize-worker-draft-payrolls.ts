import { and, eq, gte, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import { advanceRequestTable } from "@/db/tables/payroll/advanceRequestTable";
import { advanceTable } from "@/db/tables/payroll/advanceTable";
import { employmentTable } from "@/db/tables/payroll/employmentTable";
import { payrollTable } from "@/db/tables/payroll/payrollTable";
import { payrollVoucherTable } from "@/db/tables/payroll/payrollVoucherTable";
import { timesheetTable } from "@/db/tables/payroll/timesheetTable";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { calculatePay } from "@/utils/payroll/payroll-utils";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type PayrollSyncExecutor = Pick<typeof db, "select" | "update">;

export type PayrollSyncResult = { success: true } | { error: string };

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
    if (hoursNotMet == null || hoursNotMet === 0) return 0;
    return -roundMoney(Math.max(0, -hoursNotMet) * (hourlyRate ?? 0));
}

function calcNetPay(args: {
    totalPay: number;
    cpf: number | null;
    advance?: number | null;
}): number {
    return roundMoney(args.totalPay - (args.cpf ?? 0) - (args.advance ?? 0));
}

async function synchronizeWorkerDraftPayrollsWithExecutor(
    executor: PayrollSyncExecutor,
    input: {
        workerId: string;
    },
): Promise<PayrollSyncResult> {
    const workerId = input.workerId?.trim();
    if (!workerId) {
        return { error: "Missing workerId" };
    }

    try {
        const drafts = await executor
            .select()
            .from(payrollTable)
            .where(
                and(
                    eq(payrollTable.workerId, workerId),
                    eq(payrollTable.status, "Draft"),
                ),
            );

        if (drafts.length === 0) {
            return { success: true };
        }

        const [employmentRow] = await executor
            .select({ employment: employmentTable })
            .from(workerTable)
            .innerJoin(
                employmentTable,
                eq(workerTable.employmentId, employmentTable.id),
            )
            .where(eq(workerTable.id, workerId))
            .limit(1);

        const employment = employmentRow?.employment ?? null;
        if (!employment) {
            return { success: true };
        }

        for (const payroll of drafts) {
            const entryRows = await executor
                .select({ hours: timesheetTable.hours })
                .from(timesheetTable)
                .where(
                    and(
                        eq(timesheetTable.workerId, workerId),
                        gte(timesheetTable.dateIn, payroll.periodStart),
                        lte(timesheetTable.dateOut, payroll.periodEnd),
                    ),
                );
            const totalHoursWorked = entryRows.reduce(
                (sum, entry) => sum + Number(entry.hours),
                0,
            );

            const [currentVoucher] = await executor
                .select({
                    restDays: payrollVoucherTable.restDays,
                    publicHolidays: payrollVoucherTable.publicHolidays,
                })
                .from(payrollVoucherTable)
                .where(eq(payrollVoucherTable.id, payroll.payrollVoucherId))
                .limit(1);

            const payCalc = calculatePay({
                employmentType: employment.employmentType,
                totalHoursWorked,
                minimumWorkingHours: employment.minimumWorkingHours,
                monthlyPay: employment.monthlyPay,
                hourlyRate: employment.hourlyRate,
                restDayRate: employment.restDayRate,
                restDays: currentVoucher?.restDays ?? 0,
                publicHolidays: currentVoucher?.publicHolidays ?? 0,
            });

            const hoursNotMet =
                employment.minimumWorkingHours != null
                    ? clampHoursNotMet(
                          roundHours(
                              totalHoursWorked - employment.minimumWorkingHours,
                          ),
                      )
                    : null;
            const hoursNotMetDeduction = calcHoursNotMetDeduction({
                hoursNotMet,
                hourlyRate: employment.hourlyRate,
            });
            const totalPay = roundMoney(
                payCalc.totalPay + hoursNotMetDeduction,
            );

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
                        eq(advanceRequestTable.workerId, workerId),
                        gte(advanceTable.repaymentDate, payroll.periodStart),
                        lte(advanceTable.repaymentDate, payroll.periodEnd),
                    ),
                );
            const advanceTotal = advanceRows
                .filter((advance) => advance.status === "Installment Loan")
                .reduce((sum, advance) => sum + advance.amount, 0);
            const netPay = calcNetPay({
                totalPay,
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
                .where(eq(payrollVoucherTable.id, payroll.payrollVoucherId));
        }

        return { success: true };
    } catch (error) {
        console.error("Error synchronizing worker Draft payrolls", error);
        return { error: "Failed to synchronize Draft payrolls" };
    }
}

export async function synchronizeWorkerDraftPayrolls(input: {
    workerId: string;
}): Promise<PayrollSyncResult> {
    return synchronizeWorkerDraftPayrollsWithExecutor(db, input);
}

export async function synchronizeWorkerDraftPayrollsInTx(
    tx: DbTransaction,
    input: {
        workerId: string;
    },
): Promise<PayrollSyncResult> {
    return synchronizeWorkerDraftPayrollsWithExecutor(
        tx as unknown as PayrollSyncExecutor,
        input,
    );
}
