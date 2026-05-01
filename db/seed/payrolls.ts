/**
 * Payroll + voucher seed entries for the historical settled seed window.
 * Computes month-scoped values from the generated timesheets.
 */

import {
    getVoucherMinimumWorkingHours,
    isForeignFullTimeWorker,
    isLocalFullTimeWorker,
} from "./minimum-hours";
import { getAdvanceDeductionForWorkerPeriod } from "./advances";
import { settledHistoricalPayrollSeedPeriods } from "./periods";
import { getSeedPayrollStatus } from "./settlement-state";
import { timesheets } from "./timesheet";
import { workers } from "./workers";
import { publicHolidays } from "./public-holidays";
import { computeRestDaysForPayrollPeriod } from "@/utils/payroll/missing-timesheet-dates";
import { calculateVoucherAmounts } from "@/services/payroll/payroll-voucher-amounts";

function roundMoney(n: number): number {
    return Math.round(n * 100) / 100;
}

type VoucherEntry = {
    voucherNumber: string;
    employmentType: string | null;
    employmentArrangement: string | null;
    monthlyPay: number | null;
    minimumWorkingHours: number | null;
    totalHoursWorked: number;
    hoursNotMet: number | null;
    hoursNotMetDeduction: number;
    overtimeHours: number;
    hourlyRate: number | null;
    overtimePay: number;
    restDays: number;
    restDayRate: number | null;
    restDayPay: number;
    publicHolidays: number;
    publicHolidayPay: number;
    cpf: number;
    advance: number;
    subTotal: number;
    grandTotal: number;
    paymentMethod: string | null;
    payNowPhone: string | null;
    bankAccountNumber: string | null;
};

type PayrollEntry = {
    workerIndex: number;
    periodStart: string;
    periodEnd: string;
    payrollDate: string;
    status: "Draft" | "Settled";
    voucher: VoucherEntry;
};

function countWorkingDaysInPeriod(
    periodStart: string,
    periodEnd: string,
): number {
    const start = new Date(
        Date.UTC(
            Number(periodStart.slice(0, 4)),
            Number(periodStart.slice(5, 7)) - 1,
            Number(periodStart.slice(8, 10)),
        ),
    );
    const end = new Date(
        Date.UTC(
            Number(periodEnd.slice(0, 4)),
            Number(periodEnd.slice(5, 7)) - 1,
            Number(periodEnd.slice(8, 10)),
        ),
    );
    let count = 0;
    const cursor = new Date(start);
    while (cursor <= end) {
        if (cursor.getUTCDay() !== 0) {
            count += 1;
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return count;
}

function generatePayrolls(): PayrollEntry[] {
    const hoursMap = new Map<string, number>();
    const presentDateInKeysByWorkerPeriod = new Map<string, string[]>();
    let voucherSequence = 0;

    for (const t of timesheets) {
        const monthKey = t.dateIn.slice(0, 7);
        const key = `${t.workerIndex}:${monthKey}`;
        hoursMap.set(key, (hoursMap.get(key) ?? 0) + t.hours);
        const dateInKeys = presentDateInKeysByWorkerPeriod.get(key) ?? [];
        dateInKeys.push(t.dateIn);
        presentDateInKeysByWorkerPeriod.set(key, dateInKeys);
    }

    const publicHolidayDates = publicHolidays.map((h) => h.date);

    const payrolls: PayrollEntry[] = [];

    for (const period of settledHistoricalPayrollSeedPeriods) {
        const status = getSeedPayrollStatus(period);

        for (
            let workerIndex = 0;
            workerIndex < workers.length;
            workerIndex += 1
        ) {
            const worker = workers[workerIndex];
            const totalHoursWorked =
                Math.round(
                    (hoursMap.get(`${workerIndex}:${period.key}`) ?? 0) * 100,
                ) / 100;

            const minimumWorkingHours = isForeignFullTimeWorker(worker)
                ? getVoucherMinimumWorkingHours(period)
                : "minimumWorkingHours" in worker
                  ? (worker.minimumWorkingHours ?? null)
                  : null;
            const overtimeHours =
                minimumWorkingHours != null
                    ? Math.max(
                          0,
                          Math.round(
                              (totalHoursWorked - minimumWorkingHours) * 100,
                          ) / 100,
                      )
                    : 0;
            const rawHoursNotMet =
                minimumWorkingHours != null
                    ? Math.round(
                          (totalHoursWorked - minimumWorkingHours) * 100,
                      ) / 100
                    : null;
            const hoursNotMet =
                rawHoursNotMet == null
                    ? null
                    : rawHoursNotMet > 0
                      ? 0
                      : rawHoursNotMet;

            const hourlyRate =
                "hourlyRate" in worker ? (worker.hourlyRate ?? null) : null;
            const monthlyPay =
                "monthlyPay" in worker ? (worker.monthlyPay ?? null) : null;
            const restDayRate =
                "restDayRate" in worker ? (worker.restDayRate ?? null) : null;
            const isPartTime = worker.employmentType === "Part Time";
            const restDays = computeRestDaysForPayrollPeriod({
                periodStart: period.periodStart,
                periodEnd: period.periodEnd,
                presentDateInKeys:
                    presentDateInKeysByWorkerPeriod.get(
                        `${workerIndex}:${period.key}`,
                    ) ?? [],
            });

            const phDatesInPeriod = publicHolidayDates.filter(
                (date) =>
                    date >= period.periodStart && date <= period.periodEnd,
            );
            const hasTimesheets = presentDateInKeysByWorkerPeriod.has(
                `${workerIndex}:${period.key}`,
            );
            const isZeroTimesheetLocal =
                isLocalFullTimeWorker(worker) && !hasTimesheets;

            let publicHolidaysCount: number;
            if (isZeroTimesheetLocal) {
                publicHolidaysCount = phDatesInPeriod.length;
            } else {
                const presentDateInKeys =
                    presentDateInKeysByWorkerPeriod.get(
                        `${workerIndex}:${period.key}`,
                    ) ?? [];
                const presentSet = new Set(presentDateInKeys);
                publicHolidaysCount = phDatesInPeriod.filter((date) =>
                    presentSet.has(date),
                ).length;
            }

            let publicHolidayPay: number;
            if (isZeroTimesheetLocal) {
                const periodWorkingDays = countWorkingDaysInPeriod(
                    period.periodStart,
                    period.periodEnd,
                );
                publicHolidayPay = roundMoney(
                    ((monthlyPay ?? 0) / periodWorkingDays) *
                        publicHolidaysCount,
                );
            } else {
                publicHolidayPay = roundMoney(
                    (restDayRate ?? 0) * publicHolidaysCount,
                );
            }

            let basePayTotal = 0;
            let overtimePay = 0;
            let restDayPay = 0;

            if (isPartTime) {
                basePayTotal =
                    roundMoney((hourlyRate ?? 0) * totalHoursWorked) +
                    publicHolidayPay;
            } else {
                overtimePay = roundMoney((hourlyRate ?? 0) * overtimeHours);
                restDayPay = roundMoney((restDayRate ?? 0) * restDays);
                basePayTotal = roundMoney(
                    (monthlyPay ?? 0) +
                        overtimePay +
                        restDayPay +
                        publicHolidayPay,
                );
            }

            const cpf = "cpf" in worker ? (worker.cpf ?? 0) : 0;
            const advance = getAdvanceDeductionForWorkerPeriod(
                workerIndex,
                period.periodStart,
            );
            const { hoursNotMetDeduction, subTotal, grandTotal } =
                calculateVoucherAmounts({
                    basePayTotal,
                    cpf,
                    advance,
                    hoursNotMet,
                    hourlyRate,
                });

            payrolls.push({
                workerIndex,
                periodStart: period.periodStart,
                periodEnd: period.periodEnd,
                payrollDate: period.payrollDate,
                status,
                voucher: {
                    voucherNumber: `2025-${String((voucherSequence += 1)).padStart(4, "0")}`,
                    employmentType: worker.employmentType ?? null,
                    employmentArrangement: worker.employmentArrangement ?? null,
                    monthlyPay,
                    minimumWorkingHours,
                    totalHoursWorked,
                    hoursNotMet,
                    hoursNotMetDeduction,
                    overtimeHours,
                    hourlyRate,
                    overtimePay,
                    restDays,
                    restDayRate,
                    restDayPay,
                    publicHolidays: publicHolidaysCount,
                    publicHolidayPay,
                    cpf,
                    advance,
                    subTotal,
                    grandTotal,
                    paymentMethod: worker.paymentMethod ?? null,
                    payNowPhone:
                        (worker as { payNowPhone?: string | null })
                            .payNowPhone ?? null,
                    bankAccountNumber:
                        (worker as { bankAccountNumber?: string | null })
                            .bankAccountNumber ?? null,
                },
            });
        }
    }

    return payrolls;
}

export const payrolls = generatePayrolls();
