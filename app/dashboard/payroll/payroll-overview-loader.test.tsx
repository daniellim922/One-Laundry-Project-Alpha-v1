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

vi.mock("@/components/dashboard/monthly-worker-stacked-amount-overview-card", () => ({
    MonthlyWorkerStackedAmountOverviewCard: ({
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
    formatStackedChartCurrency: (value: number) => `$${value}`,
    getStackedRowTotalAmount: (row: { totalAmount: number }) => row.totalAmount,
}));

describe("PayrollOverviewLoader", () => {
    it("uses grand total terminology in payroll reporting copy", async () => {
        getPayrollMonthlyGrandTotalAggregates.mockResolvedValue({
            defaultYear: 2026,
            yearOptions: [2026],
            rows: [],
        });

        render(await PayrollOverviewLoader());

        expect(screen.getByText("Monthly Grand Total")).toBeTruthy();
        expect(
            screen.getByText(/Voucher Grand Total for Settled payrolls/i),
        ).toBeTruthy();
        expect(
            screen.getByText("No Settled payroll Grand Total for this year."),
        ).toBeTruthy();
        expect(
            screen.getByText("No Grand Total to chart for this year."),
        ).toBeTruthy();
        expect(
            screen.getByText(
                "No Grand Total to chart — all workers are deselected.",
            ),
        ).toBeTruthy();
        expect(screen.getByText("grandTotal")).toBeTruthy();
        expect(screen.queryByText(/net pay/i)).toBeNull();
    });
});
