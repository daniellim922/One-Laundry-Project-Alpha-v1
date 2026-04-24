import { describe, expect, it } from "vitest";

import { getGuidedMonthlyWorkflowSnapshot } from "@/services/payroll/guided-monthly-workflow";

describe("getGuidedMonthlyWorkflowSnapshot", () => {
    it("returns the default ordered workflow with the first step marked current", () => {
        const snapshot = getGuidedMonthlyWorkflowSnapshot({
            now: new Date("2026-04-01T00:00:00.000Z"),
        });

        expect(snapshot.monthKey).toBe("2026-04");
        expect(snapshot.steps.map((step) => step.label)).toEqual([
            "Mass edit working hours",
            "Import timesheets",
            "Generate payroll",
            "Download payrolls",
        ]);
        expect(snapshot.steps.map((step) => step.status)).toEqual([
            "current",
            "up_next",
            "up_next",
            "up_next",
        ]);
        expect(snapshot.steps.map((step) => step.href)).toEqual([
            "/dashboard/worker/mass-edit",
            "/dashboard/timesheet/import",
            "/dashboard/payroll/new",
            "/dashboard/payroll/download-payrolls",
        ]);
    });

    it("resolves the month key in the business timezone", () => {
        const snapshot = getGuidedMonthlyWorkflowSnapshot({
            now: new Date("2026-01-31T16:30:00.000Z"),
        });

        expect(snapshot.monthKey).toBe("2026-02");
    });
});
