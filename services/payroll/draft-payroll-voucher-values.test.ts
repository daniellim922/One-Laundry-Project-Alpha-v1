import { describe, expect, it } from "vitest";

import { buildDraftPayrollVoucherValues } from "@/services/payroll/draft-payroll-voucher-values";

const baseEmployment = {
    employmentType: "Full Time" as const,
    employmentArrangement: "Local Worker" as const,
    shiftPattern: "Night Shift" as const,
    minimumWorkingHours: 260,
    monthlyPay: 4000,
    hourlyRate: 10,
    restDayRate: 0,
    cpf: 100,
    paymentMethod: "Cash" as const,
    payNowPhone: null,
    bankAccountNumber: null,
};

describe("buildDraftPayrollVoucherValues", () => {
    it("includes adhoc line items in grandTotal while leaving subTotal unchanged", () => {
        const result = buildDraftPayrollVoucherValues({
            employment: baseEmployment,
            totalHoursWorked: 260,
            restDays: 0,
            publicHolidays: 0,
            advanceTotal: 50,
            adhoc: [{ name: "Transport", amount: 25 }],
        });

        expect(result.adhoc).toEqual([{ name: "Transport", amount: 25 }]);
        expect(result.subTotal).toBe(4000);
        expect(result.grandTotal).toBe(3875);
    });

    it("defaults adhoc to an empty array for new draft vouchers", () => {
        const result = buildDraftPayrollVoucherValues({
            employment: baseEmployment,
            totalHoursWorked: 260,
            restDays: 0,
            publicHolidays: 0,
            advanceTotal: 0,
        });

        expect(result.adhoc).toEqual([]);
    });

    it("copies shift pattern into the voucher employment snapshot", () => {
        const result = buildDraftPayrollVoucherValues({
            employment: baseEmployment,
            totalHoursWorked: 260,
            restDays: 0,
            publicHolidays: 0,
            advanceTotal: 0,
        });

        expect(result.shiftPattern).toBe("Night Shift");
    });
});
