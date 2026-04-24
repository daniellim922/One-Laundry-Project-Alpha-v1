/** @vitest-environment jsdom */

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
    getPayrollDetailData: vi.fn(),
    voucherEditableNumber: vi.fn(),
}));

vi.mock("@/app/dashboard/payroll/[id]/payroll-detail-data", () => ({
    getPayrollDetailData: (...args: unknown[]) =>
        mocks.getPayrollDetailData(...args),
}));

vi.mock("@/app/dashboard/payroll/[id]/voucher-editable-number", () => ({
    VoucherEditableNumber: (props: { label: string; readOnly?: boolean }) => {
        mocks.voucherEditableNumber(props);
        return (
            <div
                data-testid={`voucher-field-${props.label}`}
                data-read-only={String(Boolean(props.readOnly))}>
                {props.label}
            </div>
        );
    },
}));

vi.mock("@/app/dashboard/payroll/[id]/voucher-editable-money", () => ({
    VoucherEditableMoney: (props: { label: string; readOnly?: boolean }) => (
        <div
            data-testid={`voucher-money-${props.label}`}
            data-read-only={String(Boolean(props.readOnly))}>
            {props.label}
        </div>
    ),
}));

vi.mock("@/app/dashboard/payroll/[id]/payroll-header", () => ({
    PayrollHeader: () => <div data-testid="mock-payroll-header" />,
}));

vi.mock("@/app/dashboard/payroll/[id]/payroll-step-progress", () => ({
    PayrollStepProgress: () => <div data-testid="mock-payroll-step-progress" />,
}));

import PayrollBreakdownPage from "@/app/dashboard/payroll/[id]/breakdown/page";

afterEach(() => {
    cleanup();
});

describe("Payroll breakdown page", () => {
    it("shows editable rest days, public holidays, and pay rates on draft payrolls", async () => {
        mocks.getPayrollDetailData.mockResolvedValue({
            payroll: {
                id: "payroll-1",
                workerId: "worker-1",
                periodStart: "2026-01-01",
                periodEnd: "2026-01-31",
                payrollDate: "2026-02-05",
                status: "Draft",
            },
            worker: {
                id: "worker-1",
                name: "Alice",
            },
            employment: {
                employmentType: "Full Time",
                employmentArrangement: "Local Worker",
                monthlyPay: 2000,
                hourlyRate: 10,
                restDayRate: 15,
                minimumWorkingHours: 180,
                paymentMethod: "Cash",
                payNowPhone: null,
                bankAccountNumber: null,
            },
            voucher: {
                id: "voucher-1",
                voucherNumber: "2026-1234",
                employmentType: "Full Time",
                employmentArrangement: "Local Worker",
                paymentMethod: "Cash",
                payNowPhone: null,
                bankAccountNumber: null,
                monthlyPay: 2000,
                hourlyRate: 10,
                restDayRate: 15,
                minimumWorkingHours: 180,
                totalHoursWorked: 180,
                hoursNotMet: 0,
                hoursNotMetDeduction: 0,
                overtimeHours: 0,
                overtimePay: 0,
                restDays: 1,
                restDayPay: 15,
                publicHolidays: 2,
                publicHolidayPay: 30,
                cpf: 0,
                advance: 0,
                subTotal: 2045,
                grandTotal: 2045,
            },
            entries: [],
            missingDateIns: [],
            advances: [],
        });

        const user = userEvent.setup();
        render(
            await PayrollBreakdownPage({
                params: Promise.resolve({ id: "payroll-1" }),
            }),
        );

        await user.click(
            screen.getByRole("button", { name: /edit payroll voucher/i }),
        );

        expect(
            screen
                .getByTestId("voucher-field-Rest days worked")
                .getAttribute("data-read-only"),
        ).toBe("false");
        expect(
            screen
                .getByTestId("voucher-field-Public Holidays")
                .getAttribute("data-read-only"),
        ).toBe("false");
        expect(
            screen
                .getByTestId("voucher-money-Monthly Pay")
                .getAttribute("data-read-only"),
        ).toBe("false");

        expect(screen.getAllByText("Subtotal").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Grand Total").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Monthly Pay").length).toBeGreaterThan(0);
        expect(screen.queryByText("Total Pay")).toBeNull();
        expect(screen.queryByText("Net Pay")).toBeNull();
    });

    it("locks pay-rate and day fields for Part Time on draft payrolls except Hourly Rate", async () => {
        mocks.getPayrollDetailData.mockResolvedValue({
            payroll: {
                id: "payroll-1",
                workerId: "worker-1",
                periodStart: "2026-01-01",
                periodEnd: "2026-01-31",
                payrollDate: "2026-02-05",
                status: "Draft",
            },
            worker: {
                id: "worker-1",
                name: "Bob",
            },
            employment: {
                employmentType: "Part Time",
                employmentArrangement: "Local Worker",
                monthlyPay: null,
                hourlyRate: 8,
                restDayRate: 15,
                minimumWorkingHours: 44,
                paymentMethod: "Cash",
                payNowPhone: null,
                bankAccountNumber: null,
            },
            voucher: {
                id: "voucher-1",
                voucherNumber: "2026-0099",
                employmentType: "Part Time",
                employmentArrangement: "Local Worker",
                paymentMethod: "Cash",
                payNowPhone: null,
                bankAccountNumber: null,
                monthlyPay: null,
                hourlyRate: 8,
                restDayRate: 15,
                minimumWorkingHours: 44,
                totalHoursWorked: 40,
                hoursNotMet: 0,
                hoursNotMetDeduction: 0,
                overtimeHours: 0,
                overtimePay: 0,
                restDays: 0,
                restDayPay: 0,
                publicHolidays: 0,
                publicHolidayPay: 0,
                cpf: 0,
                advance: 0,
                subTotal: 320,
                grandTotal: 320,
            },
            entries: [],
            missingDateIns: [],
            advances: [],
        });

        const user = userEvent.setup();
        render(
            await PayrollBreakdownPage({
                params: Promise.resolve({ id: "payroll-1" }),
            }),
        );

        await user.click(
            screen.getByRole("button", { name: /edit payroll voucher/i }),
        );

        expect(
            screen
                .getByTestId("voucher-money-Monthly Pay")
                .getAttribute("data-read-only"),
        ).toBe("true");
        expect(
            screen
                .getByTestId("voucher-money-Rest Day Rate")
                .getAttribute("data-read-only"),
        ).toBe("true");
        expect(
            screen
                .getByTestId("voucher-money-Minimum Working Hours")
                .getAttribute("data-read-only"),
        ).toBe("true");
        expect(
            screen
                .getByTestId("voucher-field-Rest days worked")
                .getAttribute("data-read-only"),
        ).toBe("true");
        expect(
            screen
                .getByTestId("voucher-field-Public Holidays")
                .getAttribute("data-read-only"),
        ).toBe("true");
        expect(
            screen
                .getByTestId("voucher-money-Hourly Rate")
                .getAttribute("data-read-only"),
        ).toBe("false");
    });
});
