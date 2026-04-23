/** @vitest-environment jsdom */

import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { PayrollOverviewLoader } from "@/app/dashboard/payroll/payroll-overview-loader";

const { getPayrollMonthlyGrandTotalAggregates } = vi.hoisted(() => ({
    getPayrollMonthlyGrandTotalAggregates: vi.fn(),
}));

vi.mock("@/app/dashboard/payroll/get-payroll-monthly-grand-total-aggregates", () => ({
    getPayrollMonthlyGrandTotalAggregates,
}));

vi.mock("@/components/dashboard/dashboard-quick-actions-card", () => ({
    DashboardQuickActionsCard: ({
        title,
    }: {
        title: string;
    }) => <div>{title}</div>,
}));

vi.mock("@/app/dashboard/payroll/payroll-monthly-overview-chart", () => ({
    PayrollMonthlyOverviewChart: ({
        copy,
    }: {
        copy: {
            title: string;
            description: string;
            emptyListYear: string;
            emptyChartYear: string;
            emptyChartEmployment: string;
            stackId: string;
        };
    }) => (
        <section>
            <h2>{copy.title}</h2>
            <p>{copy.description}</p>
            <p>{copy.emptyListYear}</p>
            <p>{copy.emptyChartYear}</p>
            <p>{copy.emptyChartEmployment}</p>
            <p>{copy.stackId}</p>
        </section>
    ),
}));

describe("PayrollOverviewLoader", () => {
    it("uses subtotal and grand total copy on the monthly payroll chart", async () => {
        getPayrollMonthlyGrandTotalAggregates.mockResolvedValue({
            defaultYear: 2026,
            yearOptions: [2026],
            rows: [],
        });

        render(await PayrollOverviewLoader());

        expect(screen.getByText("Monthly payroll amounts")).toBeTruthy();
        expect(
            screen.getByText(
                /Voucher Subtotal or Grand Total for Settled payrolls/i,
            ),
        ).toBeTruthy();
        expect(
            screen.getByText("No Settled payroll amounts for this year."),
        ).toBeTruthy();
        expect(
            screen.getByText("No amount to chart for this year."),
        ).toBeTruthy();
        expect(
            screen.getByText(
                "No amount to chart — all workers are deselected.",
            ),
        ).toBeTruthy();
        expect(screen.getByText("grandTotal")).toBeTruthy();
        expect(screen.queryByText(/net pay/i)).toBeNull();
    });
});
