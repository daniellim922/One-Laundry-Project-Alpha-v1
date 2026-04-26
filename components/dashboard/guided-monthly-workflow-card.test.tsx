/** @vitest-environment jsdom */

import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { GuidedMonthlyWorkflowCard } from "@/components/dashboard/guided-monthly-workflow-card";

describe("GuidedMonthlyWorkflowCard", () => {
    it("renders ordered step links with statuses for the current month", () => {
        render(
            <GuidedMonthlyWorkflowCard
                snapshot={{
                    monthKey: "2026-04",
                    monthLabel: "April 2026",
                    steps: [
                        {
                            id: "minimum_hours_bulk_update",
                            label: "Mass edit working hours",
                            href: "/dashboard/worker/mass-edit",
                            status: "current",
                        },
                        {
                            id: "timesheet_import",
                            label: "Import timesheets",
                            href: "/dashboard/timesheet/import",
                            status: "up_next",
                        },
                        {
                            id: "payroll_creation",
                            label: "Generate payroll",
                            href: "/dashboard/payroll/new",
                            status: "up_next",
                        },
                        {
                            id: "payroll_download",
                            label: "Download payrolls",
                            href: "/dashboard/payroll/download-payrolls",
                            status: "up_next",
                        },
                        {
                            id: "payroll_settlement",
                            label: "Settle draft payrolls",
                            href: "/dashboard/payroll/settle-drafts",
                            status: "done",
                        },
                    ],
                }}
            />,
        );

        expect(screen.getByText("Guided monthly payroll workflow")).toBeTruthy();
        expect(screen.getByText(/Current business month: April 2026/i)).toBeTruthy();

        const links = screen.getAllByRole("link");
        expect(links.map((link) => link.getAttribute("href"))).toEqual([
            "/dashboard/worker/mass-edit",
            "/dashboard/timesheet/import",
            "/dashboard/payroll/new",
            "/dashboard/payroll/download-payrolls",
            "/dashboard/payroll/settle-drafts",
        ]);
        expect(links.map((link) => link.textContent)).toEqual([
            "1Mass edit working hoursCurrent",
            "2Import timesheetsUp next",
            "3Generate payrollUp next",
            "4Download payrollsUp next",
            "5Settle draft payrollsDone",
        ]);
    });
});
