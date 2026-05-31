import { describe, expect, it } from "vitest";

import { payrolls } from "@/db/seed/payrolls";
import { workers } from "@/db/seed/workers";

function findPayroll(workerName: string, periodStart: string) {
    const workerIndex = workers.findIndex(
        (worker) => worker.name === workerName,
    );
    return payrolls.find(
        (payroll) =>
            payroll.workerIndex === workerIndex &&
            payroll.periodStart === periodStart,
    );
}

describe("payroll seed vouchers", () => {
    it("locks foreign full-time voucher math for Nguyen Thi Thao in 2025-04", () => {
        expect(findPayroll("Nguyen Thi Thao", "2025-04-01")?.voucher).toEqual({
            voucherNumber: "2025-0002",
            employmentType: "Full Time",
            employmentArrangement: "Foreign Worker",
            monthlyPay: 1800,
            minimumWorkingHours: 250,
            totalHoursWorked: 255.5,
            hoursNotMet: 0,
            hoursNotMetDeduction: 0,
            overtimeHours: 5.5,
            hourlyRate: 7,
            overtimePay: 38.5,
            restDays: 0,
            restDayRate: 63.91,
            restDayPay: 0,
            publicHolidays: 1,
            publicHolidayPay: 63.91,
            cpf: 0,
            advance: 100,
            subTotal: 1902.41,
            grandTotal: 1802.41,
            paymentMethod: "PayNow",
            payNowPhone: "6581736958",
            bankAccountNumber: null,
        });
    });

    it("locks local full-time zero-timesheet voucher math for Ong Siew Lay in 2025-05", () => {
        expect(findPayroll("Ong Siew Lay", "2025-05-01")?.voucher).toEqual({
            voucherNumber: "2025-0051",
            employmentType: "Full Time",
            employmentArrangement: "Local Worker",
            monthlyPay: 1600,
            minimumWorkingHours: null,
            totalHoursWorked: 0,
            hoursNotMet: null,
            hoursNotMetDeduction: 0,
            overtimeHours: 0,
            hourlyRate: null,
            overtimePay: 0,
            restDays: 0,
            restDayRate: null,
            restDayPay: 0,
            publicHolidays: 2,
            publicHolidayPay: 118.52,
            cpf: 320,
            advance: 0,
            subTotal: 1718.52,
            grandTotal: 1398.52,
            paymentMethod: "Cash",
            payNowPhone: null,
            bankAccountNumber: null,
        });
    });

    it("locks part-time voucher math for Shubam Soni in 2025-04", () => {
        expect(findPayroll("Shubam Soni", "2025-04-01")?.voucher).toEqual({
            voucherNumber: "2025-0031",
            employmentType: "Part Time",
            employmentArrangement: "Foreign Worker",
            monthlyPay: null,
            minimumWorkingHours: null,
            totalHoursWorked: 73.75,
            hoursNotMet: null,
            hoursNotMetDeduction: 0,
            overtimeHours: 0,
            hourlyRate: 6,
            overtimePay: 0,
            restDays: 0,
            restDayRate: null,
            restDayPay: 0,
            publicHolidays: 0,
            publicHolidayPay: 0,
            cpf: 0,
            advance: 0,
            subTotal: 442.5,
            grandTotal: 442.5,
            paymentMethod: "Cash",
            payNowPhone: null,
            bankAccountNumber: null,
        });
    });
});
