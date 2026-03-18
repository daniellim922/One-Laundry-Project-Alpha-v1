/**
 * Payroll + voucher seed entries for March 2025.
 * Computes totalHoursWorked, overtimeHours, totalPay, and cpf from the
 * timesheet seed data and each worker's employment terms.
 *
 * workerIndex references the workers array in workers.ts (0-based).
 * Resolved to workerId when seeding.
 */

import { timesheets } from "./timesheet";
import { workers } from "./workers";

const REST_DAYS_MARCH_2025 = 5; // Sundays: Mar 2, 9, 16, 23, 30

export type VoucherEntry = {
    voucherNumber: number;
    employmentType: string | null;
    employmentArrangement: string | null;
    monthlyPay: number | null;
    minimumWorkingHours: number | null;
    totalHoursWorked: number;
    overtimeHours: number;
    hourlyRate: number | null;
    overtimePay: number;
    restDays: number;
    restDayRate: number | null;
    restDayPay: number;
    cpf: number;
    totalPay: number;
    paymentMethod: string | null;
    payNowPhone: string | null;
    bankAccountNumber: string | null;
};

export type PayrollEntry = {
    workerIndex: number;
    periodStart: string;
    periodEnd: string;
    payrollDate: string;
    status: "draft" | "approved" | "paid";
    voucher: VoucherEntry;
};

function generatePayrolls(): PayrollEntry[] {
    const hoursMap = new Map<number, number>();

    for (const t of timesheets) {
        hoursMap.set(t.workerIndex, (hoursMap.get(t.workerIndex) ?? 0) + t.hours);
    }

    const statusForIndex = (i: number): "draft" | "approved" | "paid" => {
        if (i === 0 || i === 31) return "draft";
        if (i === 3 || i === 10 || i === 20) return "approved";
        return "paid";
    };

    const payrolls: PayrollEntry[] = [];

    for (let wi = 0; wi < workers.length; wi++) {
        const worker = workers[wi];
        const totalHoursWorked = Math.round((hoursMap.get(wi) ?? 0) * 100) / 100;

        const minimumWorkingHours = worker.minimumWorkingHours ?? null;
        const overtimeHours = minimumWorkingHours != null
            ? Math.max(0, Math.round((totalHoursWorked - minimumWorkingHours) * 100) / 100)
            : 0;

        const hourlyRate = worker.hourlyRate ?? null;
        const monthlyPay = worker.monthlyPay ?? null;
        const restDayRate = worker.restDayRate ?? null;
        const isPartTime = worker.employmentType === "Part Time";

        let totalPay = 0;
        let overtimePay = 0;
        let restDayPay = 0;

        if (isPartTime) {
            totalPay = Math.round((hourlyRate ?? 0) * totalHoursWorked);
        } else {
            overtimePay = Math.round((hourlyRate ?? 0) * overtimeHours);
            restDayPay = Math.round((restDayRate ?? 0) * REST_DAYS_MARCH_2025);
            totalPay = (monthlyPay ?? 0) + overtimePay + restDayPay;
        }

        const cpf = worker.cpf ?? 0;

        payrolls.push({
            workerIndex: wi,
            periodStart: "2025-03-01",
            periodEnd: "2025-03-31",
            payrollDate: "2025-04-05",
            status: statusForIndex(wi),
            voucher: {
                voucherNumber: parseInt(crypto.randomUUID().slice(0, 8), 16),
                employmentType: worker.employmentType ?? null,
                employmentArrangement: worker.employmentArrangement ?? null,
                monthlyPay: monthlyPay,
                minimumWorkingHours: minimumWorkingHours,
                totalHoursWorked,
                overtimeHours,
                hourlyRate: hourlyRate,
                overtimePay,
                restDays: REST_DAYS_MARCH_2025,
                restDayRate: restDayRate,
                restDayPay,
                cpf,
                totalPay,
                paymentMethod: worker.paymentMethod ?? null,
                payNowPhone: worker.payNowPhone ?? null,
                bankAccountNumber: worker.bankAccountNumber ?? null,
            },
        });
    }

    return payrolls;
}

export const payrolls = generatePayrolls();
