import { describe, expect, it, vi } from "vitest";

const { getGuidedMonthlyWorkflowCompletedStepIds } = vi.hoisted(() => ({
    getGuidedMonthlyWorkflowCompletedStepIds: vi.fn(),
}));

vi.mock("@/services/payroll/guided-monthly-workflow-activity", () => ({
    getGuidedMonthlyWorkflowCompletedStepIds,
}));

import { getGuidedMonthlyWorkflowSnapshot } from "@/services/payroll/guided-monthly-workflow";

describe("getGuidedMonthlyWorkflowSnapshot", () => {
    it("returns the default ordered workflow with the first step marked current", async () => {
        getGuidedMonthlyWorkflowCompletedStepIds.mockResolvedValue([]);

        const snapshot = await getGuidedMonthlyWorkflowSnapshot({
            now: new Date("2026-04-01T00:00:00.000Z"),
        });

        expect(snapshot.monthKey).toBe("2026-04");
        expect(snapshot.steps.map((step) => step.label)).toEqual([
            "Mass edit working hours",
            "Import timesheets",
            "Generate payroll",
            "Download payrolls",
            "Settle draft payrolls",
        ]);
        expect(snapshot.steps.map((step) => step.status)).toEqual([
            "current",
            "up_next",
            "up_next",
            "up_next",
            "up_next",
        ]);
        expect(snapshot.steps.map((step) => step.href)).toEqual([
            "/dashboard/worker/mass-edit",
            "/dashboard/timesheet/import",
            "/dashboard/payroll/new",
            "/dashboard/payroll/download-payrolls",
            "/dashboard/payroll/settle-drafts",
        ]);
        expect(getGuidedMonthlyWorkflowCompletedStepIds).toHaveBeenCalledWith({
            monthKey: "2026-04",
        });
    });

    it("marks minimum-hours bulk update done when this business month has activity", async () => {
        getGuidedMonthlyWorkflowCompletedStepIds.mockResolvedValue([
            "minimum_hours_bulk_update",
        ]);

        const snapshot = await getGuidedMonthlyWorkflowSnapshot({
            now: new Date("2026-04-15T01:30:00.000Z"),
        });

        expect(snapshot.steps.map((step) => step.status)).toEqual([
            "done",
            "current",
            "up_next",
            "up_next",
            "up_next",
        ]);
    });

    it("marks steps two and three done for the same month and keeps ordering states", async () => {
        getGuidedMonthlyWorkflowCompletedStepIds.mockResolvedValue([
            "minimum_hours_bulk_update",
            "timesheet_import",
            "payroll_creation",
        ]);

        const snapshot = await getGuidedMonthlyWorkflowSnapshot({
            now: new Date("2026-04-20T03:30:00.000Z"),
        });

        expect(snapshot.monthKey).toBe("2026-04");
        expect(snapshot.steps.map((step) => step.status)).toEqual([
            "done",
            "done",
            "done",
            "current",
            "up_next",
        ]);
    });

    it("marks the final step done when all workflow activity exists for the month", async () => {
        getGuidedMonthlyWorkflowCompletedStepIds.mockResolvedValue([
            "minimum_hours_bulk_update",
            "timesheet_import",
            "payroll_creation",
            "payroll_download",
            "payroll_settlement",
        ]);

        const snapshot = await getGuidedMonthlyWorkflowSnapshot({
            now: new Date("2026-04-20T03:30:00.000Z"),
        });

        expect(snapshot.steps.map((step) => step.status)).toEqual([
            "done",
            "done",
            "done",
            "done",
            "done",
        ]);
    });

    it("keeps the download step current until qualifying download activity exists", async () => {
        getGuidedMonthlyWorkflowCompletedStepIds.mockResolvedValue([
            "minimum_hours_bulk_update",
            "timesheet_import",
            "payroll_creation",
        ]);

        const snapshot = await getGuidedMonthlyWorkflowSnapshot({
            now: new Date("2026-04-20T03:30:00.000Z"),
        });

        expect(snapshot.steps[3]).toMatchObject({
            id: "payroll_download",
            status: "current",
        });
        expect(snapshot.steps[4]).toMatchObject({
            id: "payroll_settlement",
            status: "up_next",
        });
    });

    it("keeps the first incomplete step current even when later steps are already done", async () => {
        getGuidedMonthlyWorkflowCompletedStepIds.mockResolvedValue([
            "timesheet_import",
            "payroll_creation",
        ]);

        const snapshot = await getGuidedMonthlyWorkflowSnapshot({
            now: new Date("2026-04-20T03:30:00.000Z"),
        });

        expect(snapshot.steps.map((step) => step.status)).toEqual([
            "current",
            "done",
            "done",
            "up_next",
            "up_next",
        ]);
    });

    it("resolves the month key in the business timezone", async () => {
        getGuidedMonthlyWorkflowCompletedStepIds.mockResolvedValue([]);

        const snapshot = await getGuidedMonthlyWorkflowSnapshot({
            now: new Date("2026-01-31T16:30:00.000Z"),
        });

        expect(snapshot.monthKey).toBe("2026-02");
    });
});
