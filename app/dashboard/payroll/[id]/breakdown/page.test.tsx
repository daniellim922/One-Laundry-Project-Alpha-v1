/** @vitest-environment jsdom */

import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
    getPayrollDetailData: vi.fn(),
    voucherEditableNumber: vi.fn(),
}));

vi.mock("@/app/dashboard/payroll/[id]/payroll-detail-data", () => ({
    getPayrollDetailData: (...args: unknown[]) =>
        mocks.getPayrollDetailData(...args),
}));

vi.mock("@/app/dashboard/payroll/[id]/voucher-editable-number", () => ({
    VoucherEditableNumber: (props: {
        label: string;
        readOnly?: boolean;
    }) => {
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

vi.mock("@/app/dashboard/payroll/[id]/payroll-header", () => ({
    PayrollHeader: () => <div data-testid="mock-payroll-header" />,
}));

vi.mock("@/app/dashboard/payroll/[id]/payroll-step-progress", () => ({
    PayrollStepProgress: () => <div data-testid="mock-payroll-step-progress" />,
}));

import PayrollBreakdownPage from "@/app/dashboard/payroll/[id]/breakdown/page";

describe("Payroll breakdown page", () => {
    it("shows public holidays as computed read-only output on draft payrolls", async () => {
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
                voucherNumber: 1234,
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

        render(
            await PayrollBreakdownPage({
                params: Promise.resolve({ id: "payroll-1" }),
            }),
        );

        expect(
            screen
                .getByTestId("voucher-field-Rest Days")
                .getAttribute("data-read-only"),
        ).toBe("false");
        expect(
            screen.queryByTestId("voucher-field-Public Holidays"),
        ).toBeNull();
        expect(screen.getByText("Computed")).toBeTruthy();
        expect(
            screen.getByText("From the shared public holiday calendar"),
        ).toBeTruthy();
    });
});
