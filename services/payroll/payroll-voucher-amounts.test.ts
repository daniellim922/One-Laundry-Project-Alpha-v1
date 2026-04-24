import { describe, expect, it } from "vitest";
import { calculateVoucherAmounts } from "./payroll-voucher-amounts";

describe("calculateVoucherAmounts", () => {
    it("caps subTotal at zero when hours-not-met deduction exceeds base pay", () => {
        const result = calculateVoucherAmounts({
            basePayTotal: 2000,
            hoursNotMet: -260, // 260 hours short
            hourlyRate: 10,
            cpf: 0,
            advance: 0,
        });

        expect(result.subTotal).toBe(0);
        expect(result.hoursNotMetDeduction).toBe(-2000);
    });

    it("produces subTotal of zero when undertime deduction exactly equals base pay", () => {
        const result = calculateVoucherAmounts({
            basePayTotal: 2000,
            hoursNotMet: -200, // 200 hours short at $10/hr = $2000 deduction
            hourlyRate: 10,
            cpf: 0,
            advance: 0,
        });

        expect(result.subTotal).toBe(0);
        expect(result.hoursNotMetDeduction).toBe(-2000);
    });

    it("preserves positive subTotal when undertime deduction is less than base pay", () => {
        const result = calculateVoucherAmounts({
            basePayTotal: 2000,
            hoursNotMet: -50, // 50 hours short at $10/hr = $500 deduction
            hourlyRate: 10,
            cpf: 0,
            advance: 0,
        });

        expect(result.subTotal).toBe(1500);
        expect(result.hoursNotMetDeduction).toBe(-500);
    });
});
