import { and, eq, gte, lte } from "drizzle-orm";

import { advanceTable } from "@/db/tables/payroll/advanceTable";
import { advanceRequestTable } from "@/db/tables/payroll/advanceRequestTable";
import { employmentTable } from "@/db/tables/payroll/employmentTable";
import { payrollTable } from "@/db/tables/payroll/payrollTable";
import { payrollVoucherTable } from "@/db/tables/payroll/payrollVoucherTable";
import { timesheetTable } from "@/db/tables/payroll/timesheetTable";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { db } from "@/lib/db";

import type { PayrollSyncRepository } from "./ports";

export const drizzlePayrollSyncRepository: PayrollSyncRepository = {
    async getDraftPayrollsForWorker(workerId) {
        return db
            .select()
            .from(payrollTable)
            .where(and(eq(payrollTable.workerId, workerId), eq(payrollTable.status, "draft")));
    },

    async getEmploymentForWorker(workerId) {
        const [row] = await db
            .select({ employment: employmentTable })
            .from(workerTable)
            .innerJoin(employmentTable, eq(workerTable.employmentId, employmentTable.id))
            .where(eq(workerTable.id, workerId))
            .limit(1);
        return row?.employment ?? null;
    },

    async getTimesheetHoursForPeriod(args) {
        return db
            .select({ hours: timesheetTable.hours })
            .from(timesheetTable)
            .where(
                and(
                    eq(timesheetTable.workerId, args.workerId),
                    gte(timesheetTable.dateIn, args.periodStart),
                    lte(timesheetTable.dateOut, args.periodEnd),
                ),
            );
    },

    async getVoucherRestDays(voucherId) {
        const [voucher] = await db
            .select({
                restDays: payrollVoucherTable.restDays,
                publicHolidays: payrollVoucherTable.publicHolidays,
            })
            .from(payrollVoucherTable)
            .where(eq(payrollVoucherTable.id, voucherId))
            .limit(1);
        return voucher ?? null;
    },

    async getLoanAdvancesForPeriod(args) {
        return db
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
                    eq(advanceRequestTable.workerId, args.workerId),
                    gte(advanceTable.repaymentDate, args.periodStart),
                    lte(advanceTable.repaymentDate, args.periodEnd),
                ),
            );
    },

    async updateVoucher(input) {
        await db
            .update(payrollVoucherTable)
            .set({
                employmentType: input.employment.employmentType,
                employmentArrangement: input.employment.employmentArrangement,
                monthlyPay: input.employment.monthlyPay,
                minimumWorkingHours: input.employment.minimumWorkingHours,
                totalHoursWorked: input.totalHoursWorked,
                hoursNotMet: input.hoursNotMet,
                hoursNotMetDeduction: input.hoursNotMetDeduction,
                overtimeHours: input.overtimeHours,
                hourlyRate: input.employment.hourlyRate,
                overtimePay: input.overtimePay,
                restDayRate: input.employment.restDayRate,
                restDayPay: input.restDayPay,
                publicHolidayPay: input.publicHolidayPay,
                cpf: input.employment.cpf,
                advance: input.advanceTotal,
                totalPay: input.totalPay,
                netPay: input.netPay,
                paymentMethod: input.employment.paymentMethod,
                payNowPhone: input.employment.payNowPhone,
                bankAccountNumber: input.employment.bankAccountNumber,
                updatedAt: new Date(),
            })
            .where(eq(payrollVoucherTable.id, input.voucherId));
    },
};
