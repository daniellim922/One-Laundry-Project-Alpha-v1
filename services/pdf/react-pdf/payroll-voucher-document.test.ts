import { describe, expect, it } from "vitest";

import {
    buildLineItems,
    type PayrollVoucherData,
} from "@/services/pdf/react-pdf/payroll-voucher-document";

function fullTimeVoucher(
    overrides: Partial<PayrollVoucherData["voucher"]> = {},
): PayrollVoucherData["voucher"] {
    return {
        voucherNumber: "2026-0001",
        employmentType: "Full Time",
        monthlyPay: 4000,
        hourlyRate: 0,
        minimumWorkingHours: 260,
        totalHoursWorked: 280,
        hoursNotMet: -20,
        hoursNotMetDeduction: 0,
        overtimeHours: 20,
        overtimePay: 0,
        restDays: 4,
        restDayRate: 0,
        restDayPay: 0,
        publicHolidays: 2,
        publicHolidayPay: 0,
        cpf: 0,
        advance: 0,
        subTotal: 4000,
        grandTotal: 4000,
        paymentMethod: "Cash",
        payNowPhone: null,
        bankAccountNumber: null,
        ...overrides,
    };
}

describe("buildLineItems", () => {
    it("omits zero-amount premium and deduction rows for zero-rate full-time workers", () => {
        const result = buildLineItems(fullTimeVoucher());

        expect(result.earnings.map((item) => item.description)).toEqual([
            "Monthly Pay",
        ]);
        expect(result.hoursNotMetItem).toBeNull();
        expect(result.deductions).toEqual([]);
    });

    it("keeps non-zero full-time premium rows visible", () => {
        const result = buildLineItems(
            fullTimeVoucher({
                hourlyRate: 10,
                overtimePay: 200,
                restDayRate: 25,
                restDayPay: 100,
                publicHolidayPay: 50,
                subTotal: 4350,
                grandTotal: 4350,
            }),
        );

        expect(result.earnings.map((item) => item.description)).toEqual([
            "Monthly Pay",
            "Overtime",
            "Rest-day premium",
            "Public Holiday Pay",
        ]);
    });
});
