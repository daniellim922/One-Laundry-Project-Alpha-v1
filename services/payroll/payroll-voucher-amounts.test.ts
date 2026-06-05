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

    it("produces no hours-not-met deduction when hourly rate is zero", () => {
        const result = calculateVoucherAmounts({
            basePayTotal: 4000,
            hoursNotMet: -40,
            hourlyRate: 0,
            cpf: 0,
            advance: 0,
        });

        expect(result.hoursNotMetDeduction).toBe(0);
        expect(result.subTotal).toBe(4000);
        expect(result.grandTotal).toBe(4000);
    });

    it("adds adhocTotal to grandTotal without changing subTotal", () => {
        const result = calculateVoucherAmounts({
            basePayTotal: 2000,
            hoursNotMet: 0,
            hourlyRate: 10,
            cpf: 100,
            advance: 50,
            adhocTotal: 75,
        });

        expect(result.subTotal).toBe(2000);
        expect(result.grandTotal).toBe(1925);
    });

    it("subtracts negative adhocTotal from grandTotal", () => {
        const result = calculateVoucherAmounts({
            basePayTotal: 2000,
            hoursNotMet: 0,
            hourlyRate: 10,
            cpf: 0,
            advance: 0,
            adhocTotal: -150,
        });

        expect(result.subTotal).toBe(2000);
        expect(result.grandTotal).toBe(1850);
    });
});
