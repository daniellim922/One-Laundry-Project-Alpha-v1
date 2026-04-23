/** @vitest-environment jsdom */

import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { VoucherCalculation } from "@/app/dashboard/payroll/[id]/breakdown/voucher/voucher-calculation";
import type { SelectPayrollVoucher } from "@/db/tables/payrollVoucherTable";

function voucherFixture(
    overrides: Partial<SelectPayrollVoucher> = {},
): SelectPayrollVoucher {
    const now = new Date("2026-01-15T00:00:00.000Z");
    return {
        id: "voucher-1",
        voucherNumber: 1,
        employmentType: "Full Time",
        employmentArrangement: "Local Worker",
        monthlyPay: 2000,
        minimumWorkingHours: 180,
        totalHoursWorked: 167.5,
        hoursNotMet: -12.5,
        hoursNotMetDeduction: -100,
        overtimeHours: 0,
        hourlyRate: 8,
        overtimePay: 0,
        restDays: 0,
        restDayRate: 15,
        restDayPay: 0,
        publicHolidays: 0,
        publicHolidayPay: 0,
        cpf: 0,
        advance: 0,
        subTotal: 1900,
        grandTotal: 1900,
        paymentMethod: "Cash",
        payNowPhone: null,
        bankAccountNumber: null,
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

afterEach(() => {
    cleanup();
});

describe("VoucherCalculation", () => {
    it("shows shortfall hours × hourly rate in Hours Not Met subtext", () => {
        render(
            <VoucherCalculation
                payrollId="pay-1"
                payrollStatus="Draft"
                voucher={voucherFixture()}
                advances={[]}
                attendanceRestDays={0}
            />,
        );

        expect(screen.getByText("Hours Not Met")).toBeTruthy();
        const body = document.body.textContent ?? "";
        expect(body).toContain("12.5 hrs short");
        expect(body).toMatch(/×\s*\$\s*8\s*\/\s*hr/);
    });

    it("falls back to shortfall only when hourly rate is missing", () => {
        render(
            <VoucherCalculation
                payrollId="pay-1"
                payrollStatus="Draft"
                voucher={voucherFixture({ hourlyRate: null })}
                advances={[]}
                attendanceRestDays={0}
            />,
        );

        const body = document.body.textContent ?? "";
        expect(body).toContain("12.5 hrs short");
        expect(body).not.toMatch(/×\s*\$\s*8\s*\/\s*hr/);
    });

    it("shows Hourly Rate label and regular hours x rate subtext for hourly vouchers", () => {
        render(
            <VoucherCalculation
                payrollId="pay-1"
                payrollStatus="Draft"
                voucher={voucherFixture({
                    monthlyPay: null,
                    hourlyRate: 6,
                    totalHoursWorked: 67.25,
                    overtimeHours: 2,
                    hoursNotMet: 0,
                    hoursNotMetDeduction: 0,
                    subTotal: 391.5,
                    grandTotal: 391.5,
                })}
                advances={[]}
                attendanceRestDays={0}
            />,
        );

        expect(screen.getByText("Hourly Rate")).toBeTruthy();
        const body = document.body.textContent ?? "";
        expect(body).toContain("65.25 hrs x $6");
    });

    it("hides Rest-day premium and Public Holiday Pay when the amounts are zero", () => {
        render(
            <VoucherCalculation
                payrollId="pay-1"
                payrollStatus="Draft"
                voucher={voucherFixture({
                    restDayPay: 0,
                    publicHolidayPay: 0,
                })}
                advances={[]}
                attendanceRestDays={0}
            />,
        );

        expect(screen.queryByText("Rest-day premium")).toBeNull();
        expect(screen.queryByText("Public Holiday Pay")).toBeNull();
    });

    it("shows Rest-day premium and Public Holiday Pay when the amounts are non-zero", () => {
        render(
            <VoucherCalculation
                payrollId="pay-1"
                payrollStatus="Draft"
                voucher={voucherFixture({
                    restDayPay: 50,
                    publicHolidayPay: 25,
                })}
                advances={[]}
                attendanceRestDays={0}
            />,
        );

        expect(screen.getByText("Rest-day premium")).toBeTruthy();
        expect(screen.getByText("Public Holiday Pay")).toBeTruthy();
    });
});
