import { and, eq, gte, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import { payrollTable } from "@/db/tables/payrollTable";
import { payrollVoucherTable } from "@/db/tables/payrollVoucherTable";
import { workerTable } from "@/db/tables/workerTable";
import { timesheetTable } from "@/db/tables/timesheetTable";
import { dateToLocalIsoYmd } from "@/utils/time/calendar-date";
import type { PayrollPdfData } from "@/services/pdf/react-pdf";
import { getBundledApproverSignatureDataUrl } from "@/services/pdf/approver-signature";
import { formatEnGbDmyNumericFromCalendar } from "@/utils/time/intl-en-gb";

function normalizePgDate(value: string | Date): string {
    return value instanceof Date ? dateToLocalIsoYmd(value) : value;
}

/**
 * Assembles the live {@link PayrollPdfData} for a payroll from its voucher and
 * in-period timesheet entries. Returns `null` when the payroll does not exist.
 * Shared by the pdf-data API route and the server-side PDF regenerator so both
 * read from a single source of truth.
 */
export async function buildPayrollPdfData(
    payrollId: string,
): Promise<PayrollPdfData | null> {
    const [row] = await db
        .select({
            payroll: payrollTable,
            worker: workerTable,
            voucher: payrollVoucherTable,
        })
        .from(payrollTable)
        .innerJoin(workerTable, eq(payrollTable.workerId, workerTable.id))
        .innerJoin(
            payrollVoucherTable,
            eq(payrollTable.payrollVoucherId, payrollVoucherTable.id),
        )
        .where(eq(payrollTable.id, payrollId))
        .limit(1);

    if (!row) {
        return null;
    }

    const { payroll, worker, voucher } = row;

    const entries = await db
        .select({
            dateIn: timesheetTable.dateIn,
            timeIn: timesheetTable.timeIn,
            dateOut: timesheetTable.dateOut,
            timeOut: timesheetTable.timeOut,
            hours: timesheetTable.hours,
        })
        .from(timesheetTable)
        .where(
            and(
                eq(timesheetTable.workerId, payroll.workerId),
                gte(timesheetTable.dateIn, payroll.periodStart),
                lte(timesheetTable.dateOut, payroll.periodEnd),
            ),
        )
        .orderBy(timesheetTable.dateIn);

    const periodStart = normalizePgDate(payroll.periodStart);
    const periodEnd = normalizePgDate(payroll.periodEnd);
    const payrollDate = normalizePgDate(payroll.payrollDate);

    return {
        voucher: {
            voucher: {
                voucherNumber: voucher.voucherNumber,
                employmentType: voucher.employmentType,
                monthlyPay: voucher.monthlyPay,
                hourlyRate: voucher.hourlyRate,
                minimumWorkingHours: voucher.minimumWorkingHours,
                totalHoursWorked: voucher.totalHoursWorked,
                hoursNotMet: voucher.hoursNotMet,
                hoursNotMetDeduction: voucher.hoursNotMetDeduction,
                overtimeHours: voucher.overtimeHours,
                overtimePay: voucher.overtimePay,
                restDays: voucher.restDays,
                restDayRate: voucher.restDayRate,
                restDayPay: voucher.restDayPay,
                publicHolidays: voucher.publicHolidays,
                publicHolidayPay: voucher.publicHolidayPay,
                cpf: voucher.cpf,
                advance: voucher.advance,
                subTotal: voucher.subTotal,
                grandTotal: voucher.grandTotal,
                paymentMethod: voucher.paymentMethod,
                payNowPhone: voucher.payNowPhone,
                bankAccountNumber: voucher.bankAccountNumber,
            },
            periodLabel: `${formatEnGbDmyNumericFromCalendar(periodStart)} – ${formatEnGbDmyNumericFromCalendar(periodEnd)}`,
            voucherDate: formatEnGbDmyNumericFromCalendar(payrollDate),
            workerName: worker.name,
            approverSignatureDataUrl: getBundledApproverSignatureDataUrl(),
        },
        timesheet: {
            entries: entries.map((e) => ({
                dateIn: normalizePgDate(e.dateIn),
                timeIn: e.timeIn,
                dateOut: e.dateOut ? normalizePgDate(e.dateOut) : null,
                timeOut: e.timeOut,
                hours: e.hours,
            })),
            periodStart,
            periodEnd,
            workerName: worker.name,
        },
    };
}
