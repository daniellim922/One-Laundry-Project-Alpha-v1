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
import {
    settledHistoricalPayrollSeedPeriods,
    type SeedPeriod,
} from "./periods";
import { getSeedPayrollStatus } from "./settlement-state";
import { timesheets } from "./timesheet";
import { workers } from "./workers";
import { publicHolidays } from "./public-holidays";
import { computeRestDaysForPayrollPeriod } from "@/utils/payroll/missing-timesheet-dates";
import { buildDraftPayrollVoucherValues } from "@/services/payroll/draft-payroll-voucher-values";

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

type SeedWorker = (typeof workers)[number];

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

function resolveSeedMinimumWorkingHours(
    worker: SeedWorker,
    period: SeedPeriod,
): number | null {
    const hasNoMinimumWorkingHours =
        "minimumWorkingHours" in worker && worker.minimumWorkingHours == null;

    if (hasNoMinimumWorkingHours) {
        return null;
    }

    if (isForeignFullTimeWorker(worker)) {
        return getVoucherMinimumWorkingHours(period);
    }

    return "minimumWorkingHours" in worker
        ? (worker.minimumWorkingHours ?? null)
        : null;
}

function buildSeedEmploymentSnapshot(worker: SeedWorker, period: SeedPeriod) {
    return {
        employmentType: worker.employmentType,
        employmentArrangement: worker.employmentArrangement ?? null,
        minimumWorkingHours: resolveSeedMinimumWorkingHours(worker, period),
        monthlyPay: "monthlyPay" in worker ? (worker.monthlyPay ?? null) : null,
        hourlyRate: "hourlyRate" in worker ? (worker.hourlyRate ?? null) : null,
        restDayRate:
            "restDayRate" in worker ? (worker.restDayRate ?? null) : null,
        cpf: "cpf" in worker ? (worker.cpf ?? 0) : 0,
        paymentMethod: worker.paymentMethod ?? null,
        payNowPhone:
            "payNowPhone" in worker ? (worker.payNowPhone ?? null) : null,
        bankAccountNumber:
            "bankAccountNumber" in worker &&
            typeof worker.bankAccountNumber === "string"
                ? worker.bankAccountNumber
                : null,
    };
}

function countSeedPublicHolidays(args: {
    period: SeedPeriod;
    presentDateInKeys: string[];
    isZeroTimesheetLocal: boolean;
}): number {
    const phDatesInPeriod = publicHolidays
        .map((holiday) => holiday.date)
        .filter(
            (date) =>
                date >= args.period.periodStart &&
                date <= args.period.periodEnd,
        );

    // Seed invariant: local FT workers with no timesheets in the period still
    // accrue every configured public holiday in that period, not only worked PH dates.
    if (args.isZeroTimesheetLocal) {
        return phDatesInPeriod.length;
    }

    const presentSet = new Set(args.presentDateInKeys);
    return phDatesInPeriod.filter((date) => presentSet.has(date)).length;
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

    const payrolls: PayrollEntry[] = [];

    for (const period of settledHistoricalPayrollSeedPeriods) {
        const status = getSeedPayrollStatus(period);

        for (
            let workerIndex = 0;
            workerIndex < workers.length;
            workerIndex += 1
        ) {
            const worker = workers[workerIndex];
            const periodKey = `${workerIndex}:${period.key}`;
            const presentDateInKeys =
                presentDateInKeysByWorkerPeriod.get(periodKey) ?? [];
            const totalHoursWorked =
                Math.round((hoursMap.get(periodKey) ?? 0) * 100) / 100;
            const hasTimesheets =
                presentDateInKeysByWorkerPeriod.has(periodKey);
            const isZeroTimesheetLocal =
                isLocalFullTimeWorker(worker) && !hasTimesheets;
            const restDays = computeRestDaysForPayrollPeriod({
                periodStart: period.periodStart,
                periodEnd: period.periodEnd,
                presentDateInKeys,
            });
            const publicHolidaysCount = countSeedPublicHolidays({
                period,
                presentDateInKeys,
                isZeroTimesheetLocal,
            });
            const employment = buildSeedEmploymentSnapshot(worker, period);
            // Zero-timesheet local FT workers: derive restDayRate only for voucher
            // calculation (public-holiday pay); persisted restDayRate stays unchanged.
            const employmentForCalc =
                isZeroTimesheetLocal && employment.monthlyPay != null
                    ? {
                          ...employment,
                          restDayRate:
                              employment.monthlyPay /
                              countWorkingDaysInPeriod(
                                  period.periodStart,
                                  period.periodEnd,
                              ),
                      }
                    : employment;
            const advanceTotal = getAdvanceDeductionForWorkerPeriod(
                workerIndex,
                period.periodStart,
            );

            const voucherValues = buildDraftPayrollVoucherValues({
                employment: employmentForCalc,
                totalHoursWorked,
                restDays,
                publicHolidays: publicHolidaysCount,
                advanceTotal,
            });

            payrolls.push({
                workerIndex,
                periodStart: period.periodStart,
                periodEnd: period.periodEnd,
                payrollDate: period.payrollDate,
                status,
                voucher: {
                    ...voucherValues,
                    voucherNumber: `2025-${String((voucherSequence += 1)).padStart(4, "0")}`,
                    restDayRate: employment.restDayRate,
                } as VoucherEntry,
            });
        }
    }

    return payrolls;
}

export const payrolls = generatePayrolls();
