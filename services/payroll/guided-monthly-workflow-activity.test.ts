import { beforeEach, describe, expect, it, vi } from "vitest";

import { guidedMonthlyWorkflowActivityTable } from "@/db/tables/guidedMonthlyWorkflowActivityTable";

const mocks = vi.hoisted(() => ({
    db: {
        select: vi.fn(),
        insert: vi.fn(),
    },
}));

vi.mock("@/lib/db", () => ({
    db: mocks.db,
}));

import {
    getGuidedMonthlyWorkflowCompletedStepIds,
    recordGuidedMonthlyWorkflowStepCompletion,
} from "@/services/payroll/guided-monthly-workflow-activity";

describe("guided-monthly-workflow-activity", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("getGuidedMonthlyWorkflowCompletedStepIds maps rows to step ids", async () => {
        mocks.db.select.mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([
                    { stepId: "timesheet_import" },
                    { stepId: "payroll_creation" },
                ]),
            }),
        });

        await expect(
            getGuidedMonthlyWorkflowCompletedStepIds({ monthKey: "2026-03" }),
        ).resolves.toEqual(["timesheet_import", "payroll_creation"]);
    });

    it("recordGuidedMonthlyWorkflowStepCompletion upserts using Asia/Singapore month key", async () => {
        const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
        const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
        mocks.db.insert.mockReturnValue({ values });

        const now = new Date("2026-05-10T16:30:00.000Z");

        await recordGuidedMonthlyWorkflowStepCompletion({
            stepId: "timesheet_import",
            now,
        });

        expect(mocks.db.insert).toHaveBeenCalledWith(
            guidedMonthlyWorkflowActivityTable,
        );
        expect(values).toHaveBeenCalledWith({
            monthKey: "2026-05",
            stepId: "timesheet_import",
            completedAt: now,
            updatedAt: now,
        });
        expect(onConflictDoUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                target: [
                    guidedMonthlyWorkflowActivityTable.monthKey,
                    guidedMonthlyWorkflowActivityTable.stepId,
                ],
                set: {
                    completedAt: now,
                    updatedAt: now,
                },
            }),
        );
    });

    it("uses Singapore calendar month when UTC date is still the previous calendar day", async () => {
        const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
        const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
        mocks.db.insert.mockReturnValue({ values });

        const now = new Date("2026-04-30T16:00:00.000Z");

        await recordGuidedMonthlyWorkflowStepCompletion({
            stepId: "payroll_settlement",
            now,
        });

        expect(values).toHaveBeenCalledWith(
            expect.objectContaining({
                monthKey: "2026-05",
            }),
        );
    });
});
