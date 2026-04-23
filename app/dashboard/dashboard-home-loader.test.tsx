/** @vitest-environment jsdom */

import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { DashboardHomeLoader } from "@/app/dashboard/dashboard-home-loader";

const { getPayrollMonthlyCategoryAggregates } = vi.hoisted(() => ({
    getPayrollMonthlyCategoryAggregates: vi.fn(),
}));

vi.mock("@/app/dashboard/get-payroll-monthly-category-aggregates", () => ({
    getPayrollMonthlyCategoryAggregates,
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

describe("DashboardHomeLoader", () => {
    it("renders category payroll chart copy", async () => {
        getPayrollMonthlyCategoryAggregates.mockResolvedValue({
            defaultYear: 2026,
            yearOptions: [2026],
            rows: [],
        });

        render(await DashboardHomeLoader());

        expect(screen.getByText("Monthly payroll by category")).toBeTruthy();
        expect(
            screen.getByText(/Settled payrolls by calendar month/i),
        ).toBeTruthy();
    });
});
