/** @vitest-environment jsdom */

import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { MonthlyPayrollCategoryStackedOverviewCard } from "@/components/dashboard/monthly-payroll-category-stacked-overview-card";

describe("MonthlyPayrollCategoryStackedOverviewCard", () => {
    it("shows category checkboxes and year control", () => {
        render(
            <MonthlyPayrollCategoryStackedOverviewCard
                rows={[
                    {
                        year: 2026,
                        month: 1,
                        ptForeignSubtotal: 100,
                        ftForeignSubtotal: 200,
                        namedWorkersSubtotal: 50,
                        ftLocalCpf: 25,
                    },
                ]}
                defaultYear={2026}
                yearOptions={[2026, 2025]}
                title="Test chart"
                description="Test description"
                idPrefix="test-cat"
                stackId="testStack"
            />,
        );

        expect(screen.getByText("Test chart")).toBeTruthy();
        expect(screen.getByText("Test description")).toBeTruthy();
        expect(
            screen.getByText("Sub Total paid to PT foreign workers"),
        ).toBeTruthy();
        expect(
            screen.getByText("Subtotal paid to FT foreign workers"),
        ).toBeTruthy();
        expect(
            screen.getByText("Subtotal paid to Alvis Ong and Ong Chong Wee"),
        ).toBeTruthy();
        expect(
            screen.getByText("CPF paid to FT local worker"),
        ).toBeTruthy();
        expect(
            screen.getByRole("combobox", { name: /calendar year/i }),
        ).toBeTruthy();
    });
});
