/**
 * Payroll + voucher seed entries for April 2025 through March 2026.
 * Computes month-scoped values from the generated timesheets.
 */

import {
    getVoucherMinimumWorkingHours,
    isForeignFullTimeWorker,
} from "./minimum-hours";
import { getAdvanceDeductionForWorkerPeriod } from "./advances";
import { seedPeriods } from "./periods";
import { timesheets } from "./timesheet";
import { workers } from "./workers";

function roundMoney(n: number): number {
    return Math.round(n * 100) / 100;
}

export type VoucherEntry = {
    voucherNumber: number;
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
    totalPay: number;
    netPay: number;
    paymentMethod: string | null;
    payNowPhone: string | null;
    bankAccountNumber: string | null;
};

export type PayrollEntry = {
    workerIndex: number;
    periodStart: string;
    periodEnd: string;
    payrollDate: string;
    status: "Draft" | "Settled";
    voucher: VoucherEntry;
};

function generatePayrolls(): PayrollEntry[] {
    const hoursMap = new Map<string, number>();

    for (const t of timesheets) {
        const monthKey = t.dateIn.slice(0, 7);
        const key = `${t.workerIndex}:${monthKey}`;
        hoursMap.set(key, (hoursMap.get(key) ?? 0) + t.hours);
    }

    const payrolls: PayrollEntry[] = [];

    for (const period of seedPeriods) {
        const status: "Draft" | "Settled" =
            period.year === 2025 ? "Settled" : "Draft";

        for (let workerIndex = 0; workerIndex < workers.length; workerIndex += 1) {
            const worker = workers[workerIndex];
            const totalHoursWorked =
                Math.round(
                    (hoursMap.get(`${workerIndex}:${period.key}`) ?? 0) * 100,
                ) / 100;

            const minimumWorkingHours = isForeignFullTimeWorker(worker)
                ? getVoucherMinimumWorkingHours(period)
                : "minimumWorkingHours" in worker
                  ? worker.minimumWorkingHours ?? null
                  : null;
            const overtimeHours =
                minimumWorkingHours != null
                    ? Math.max(
                          0,
                          Math.round((totalHoursWorked - minimumWorkingHours) * 100) /
                              100,
                      )
                    : 0;
            const rawHoursNotMet =
                minimumWorkingHours != null
                    ? Math.round((totalHoursWorked - minimumWorkingHours) * 100) /
                      100
                    : null;
            const hoursNotMet =
                rawHoursNotMet == null
                    ? null
                    : rawHoursNotMet > 0
                      ? 0
                      : rawHoursNotMet;

            const hourlyRate =
                "hourlyRate" in worker ? worker.hourlyRate ?? null : null;
            const monthlyPay =
                "monthlyPay" in worker ? worker.monthlyPay ?? null : null;
            const restDayRate =
                "restDayRate" in worker ? worker.restDayRate ?? null : null;
            const isPartTime = worker.employmentType === "Part Time";

            let totalPay = 0;
            let overtimePay = 0;
            let restDayPay = 0;
            const publicHolidays = 0;
            const publicHolidayPay = 0;

            if (isPartTime) {
                totalPay =
                    roundMoney((hourlyRate ?? 0) * totalHoursWorked) +
                    publicHolidayPay;
            } else {
                overtimePay = roundMoney((hourlyRate ?? 0) * overtimeHours);
                restDayPay = roundMoney((restDayRate ?? 0) * period.restDays);
                totalPay = roundMoney(
                    (monthlyPay ?? 0) +
                        overtimePay +
                        restDayPay +
                        publicHolidayPay,
                );
            }

            const cpf = "cpf" in worker ? worker.cpf ?? 0 : 0;
            const advance = getAdvanceDeductionForWorkerPeriod(
                workerIndex,
                period.periodStart,
            );
            const hoursNotMetDeduction =
                hoursNotMet != null && hoursNotMet !== 0
                    ? -roundMoney(Math.max(0, -hoursNotMet) * (hourlyRate ?? 0))
                    : 0;
            totalPay = roundMoney(totalPay + hoursNotMetDeduction);
            const netPay = roundMoney(totalPay - cpf - advance);

            payrolls.push({
                workerIndex,
                periodStart: period.periodStart,
                periodEnd: period.periodEnd,
                payrollDate: period.payrollDate,
                status,
                voucher: {
                    voucherNumber: period.monthIndex * 1000 + workerIndex + 1,
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
                    restDays: period.restDays,
                    restDayRate,
                    restDayPay,
                    publicHolidays,
                    publicHolidayPay,
                    cpf,
                    advance,
                    totalPay,
                    netPay,
                    paymentMethod: worker.paymentMethod ?? null,
                    payNowPhone:
                        (worker as { payNowPhone?: string | null }).payNowPhone ??
                        null,
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
