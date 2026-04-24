/** @vitest-environment jsdom */

import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { DashboardHomeLoader } from "@/app/dashboard/dashboard-home-loader";

const { getPayrollMonthlyCategoryAggregates } = vi.hoisted(() => ({
    getPayrollMonthlyCategoryAggregates: vi.fn(),
}));
const { getGuidedMonthlyWorkflowSnapshot } = vi.hoisted(() => ({
    getGuidedMonthlyWorkflowSnapshot: vi.fn(),
}));

vi.mock("@/app/dashboard/get-payroll-monthly-category-aggregates", () => ({
    getPayrollMonthlyCategoryAggregates,
}));
vi.mock("@/services/payroll/guided-monthly-workflow", () => ({
    getGuidedMonthlyWorkflowSnapshot,
}));

vi.mock(
    "@/components/dashboard/monthly-payroll-category-stacked-overview-card",
    () => ({
        MonthlyPayrollCategoryStackedOverviewCard: ({
            title,
            description,
        }: {
            title: string;
            description: string;
        }) => (
            <section>
                <h2>{title}</h2>
                <p>{description}</p>
            </section>
        ),
    }),
);
vi.mock("@/components/dashboard/guided-monthly-workflow-card", () => ({
    GuidedMonthlyWorkflowCard: ({
        snapshot,
    }: {
        snapshot: { monthLabel: string };
    }) => (
        <section>
            <h2>Guided monthly payroll workflow</h2>
            <p>Current business month: {snapshot.monthLabel}</p>
        </section>
    ),
}));

describe("DashboardHomeLoader", () => {
    it("renders category payroll chart copy", async () => {
        getPayrollMonthlyCategoryAggregates.mockResolvedValue({
            defaultYear: 2026,
            yearOptions: [2026],
            rows: [],
        });
        getGuidedMonthlyWorkflowSnapshot.mockReturnValue({
            monthKey: "2026-04",
            monthLabel: "April 2026",
            steps: [],
        });

        render(await DashboardHomeLoader());

        const headings = screen.getAllByRole("heading", { level: 2 });
        expect(headings.map((heading) => heading.textContent)).toEqual([
            "Guided monthly payroll workflow",
            "Monthly payroll by category",
        ]);
        expect(
            screen.getByText(/Current business month: April 2026/i),
        ).toBeTruthy();
        expect(screen.getByText("Monthly payroll by category")).toBeTruthy();
        expect(
            screen.getByText(/Settled payrolls by calendar month/i),
        ).toBeTruthy();
        expect(getGuidedMonthlyWorkflowSnapshot).toHaveBeenCalledTimes(1);
    });
});
