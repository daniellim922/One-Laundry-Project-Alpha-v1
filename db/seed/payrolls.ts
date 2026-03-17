/**
 * Payroll seed entries for March 2025.
 * Computes totalHours, overtimeHours, totalPay, and cpf from the
 * timesheet seed data and each worker's employment terms.
 *
 * workerIndex references the workers array in workers.ts (0-based).
 * Resolved to workerId when seeding.
 */

import { timesheets } from "./timesheet";
import { workers } from "./workers";

const STANDARD_HOURS_PER_MONTH = 176;
const OT_MULTIPLIER = 1.5;
const REST_DAYS_MARCH_2025 = 5; // Sundays: Mar 2, 9, 16, 23, 30

type PayrollEntry = {
    workerIndex: number;
    periodStart: string;
    periodEnd: string;
    payrollDate: string;
    totalHours: number;
    overtimeHours: number;
    restDays: number;
    cpf: number;
    totalPay: number;
    status: "draft" | "approved" | "paid";
};

function generatePayrolls(): PayrollEntry[] {
    const hoursMap = new Map<
        number,
        { total: number; dailyHours: Map<string, number> }
    >();

    for (const t of timesheets) {
        let entry = hoursMap.get(t.workerIndex);
        if (!entry) {
            entry = { total: 0, dailyHours: new Map() };
            hoursMap.set(t.workerIndex, entry);
        }
        entry.total += t.hours;
        const existing = entry.dailyHours.get(t.dateIn) ?? 0;
        entry.dailyHours.set(t.dateIn, existing + t.hours);
    }

    const statusForIndex = (i: number): "draft" | "approved" | "paid" => {
        if (i === 0 || i === 31) return "draft";
        if (i === 3 || i === 10 || i === 20) return "approved";
        return "paid";
    };

    const payrolls: PayrollEntry[] = [];

    for (let wi = 0; wi < workers.length; wi++) {
        const worker = workers[wi];
        const hrs = hoursMap.get(wi);
        const totalHours = hrs
            ? Math.round(hrs.total * 100) / 100
            : 0;
        const dailyHours = hrs
            ? Array.from(hrs.dailyHours.values())
            : [];

        let overtimeHours = 0;
        let totalPay = 0;

        const hourlyPay = worker.hourlyPay;
        const monthlyPay = worker.monthlyPay;

        if (hourlyPay != null) {
            totalPay = Math.round(totalHours * hourlyPay);
        } else if (monthlyPay != null) {
            const hourlyRate = monthlyPay / STANDARD_HOURS_PER_MONTH;
            for (const h of dailyHours) {
                if (h > 8) overtimeHours += h - 8;
            }
            overtimeHours = Math.round(overtimeHours * 100) / 100;
            const overtimePay = Math.round(
                overtimeHours * hourlyRate * OT_MULTIPLIER,
            );
            totalPay = monthlyPay + overtimePay;
        }

        const cpf = worker.cpf ?? 0;

        payrolls.push({
            workerIndex: wi,
            periodStart: "2025-03-01",
            periodEnd: "2025-03-31",
            payrollDate: "2025-04-05",
            totalHours,
            overtimeHours,
            restDays: REST_DAYS_MARCH_2025,
            cpf,
            totalPay,
            status: statusForIndex(wi),
        });
    }

    return payrolls;
}

export const payrolls = generatePayrolls();
