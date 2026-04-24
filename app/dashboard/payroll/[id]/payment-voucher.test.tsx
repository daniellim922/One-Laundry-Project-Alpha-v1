/** @vitest-environment jsdom */

import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { PaymentVoucher } from "@/app/dashboard/payroll/[id]/payment-voucher";

describe("PaymentVoucher", () => {
    it("renders the canonical voucher labels for full-time payrolls", () => {
        render(
            <PaymentVoucher
                voucher={{
                    voucherNumber: "2026-1001",
                    employmentType: "Full Time",
                    monthlyPay: 2000,
                    hourlyRate: 10,
                    minimumWorkingHours: 180,
                    totalHoursWorked: 180,
                    hoursNotMet: 0,
                    hoursNotMetDeduction: 0,
                    overtimeHours: 0,
                    overtimePay: 0,
                    restDays: 0,
                    restDayRate: 15,
                    restDayPay: 0,
                    publicHolidays: 0,
                    publicHolidayPay: 0,
                    cpf: 100,
                    advance: 50,
                    subTotal: 2000,
                    grandTotal: 1850,
                    paymentMethod: "Cash",
                    payNowPhone: null,
                    bankAccountNumber: null,
                }}
                payroll={{
                    id: "payroll-1",
                    periodStart: "2026-01-01",
                    periodEnd: "2026-01-31",
                    payrollDate: "2026-02-05",
                }}
                workerName="Alice"
                showDownloadButton={false}
            />,
        );

        expect(screen.getByText("Monthly Pay")).toBeTruthy();
        expect(screen.getByText("Subtotal")).toBeTruthy();
        expect(screen.getByText("Grand Total")).toBeTruthy();
        expect(screen.queryByText(/Basic Salary for/i)).toBeNull();
    });

    it("uses Hourly Rate as the part-time base earnings line", () => {
        render(
            <PaymentVoucher
                voucher={{
                    voucherNumber: "2026-2002",
                    employmentType: "Part Time",
                    monthlyPay: null,
                    hourlyRate: 6,
                    minimumWorkingHours: 0,
                    totalHoursWorked: 10,
                    hoursNotMet: 0,
                    hoursNotMetDeduction: 0,
                    overtimeHours: 0,
                    overtimePay: 0,
                    restDays: 0,
                    restDayRate: null,
                    restDayPay: 0,
                    publicHolidays: 0,
                    publicHolidayPay: 0,
                    cpf: 0,
                    advance: 0,
                    subTotal: 60,
                    grandTotal: 60,
                    paymentMethod: "Cash",
                    payNowPhone: null,
                    bankAccountNumber: null,
                }}
                payroll={{
                    id: "payroll-2",
                    periodStart: "2026-01-01",
                    periodEnd: "2026-01-31",
                    payrollDate: "2026-02-05",
                }}
                workerName="Pat"
                showDownloadButton={false}
            />,
        );

        expect(screen.getByText("Hourly Rate")).toBeTruthy();
    });
});
