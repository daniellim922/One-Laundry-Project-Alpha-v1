import { beforeEach, describe, expect, it, vi } from "vitest";

import { makePayroll } from "@/test/factories/payroll";
import {
    clonePayrollCommandState,
    configureStatefulPayrollCommandDatabase,
    makePayrollCommandState,
} from "@/test/_support/payroll-command-test-state";

const mocks = vi.hoisted(() => ({
    db: {
        select: vi.fn(),
        update: vi.fn(),
        transaction: vi.fn(),
    },
}));

vi.mock("@/lib/db", () => ({
    db: mocks.db,
}));

vi.mock("@/services/payroll/guided-monthly-workflow-activity", () => ({
    recordGuidedMonthlyWorkflowStepCompletion: vi.fn().mockResolvedValue(undefined),
}));

import { settleDraftPayrolls } from "@/services/payroll/settle-draft-payrolls";

describe("payroll command services / settleDraftPayrolls", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("settleDraftPayrolls validates the full selection before applying batch side effects", async () => {
        mocks.db.transaction.mockImplementationOnce(
            async (callback: (tx: unknown) => Promise<void>) =>
                callback({
                    select: vi.fn().mockReturnValue({
                        from: vi.fn().mockReturnValue({
                            where: vi.fn().mockResolvedValue([
                                makePayroll({ id: "payroll-1" }),
                                makePayroll({
                                    id: "payroll-2",
                                    status: "Settled",
                                }),
                            ]),
                        }),
                    }),
                }),
        );

        await expect(
            settleDraftPayrolls({
                payrollIds: ["payroll-1", "payroll-2"],
            }),
        ).resolves.toEqual({
            success: false,
            code: "INVALID_STATE",
            error: "One or more payrolls are not drafts",
        });
    });

    it("settleDraftPayrolls settles only selected Draft payrolls while preserving unrelated data", async () => {
        const state = makePayrollCommandState();
        const selectedIds = ["payroll-1", "payroll-other-period"];
        const preserved = {
            workers: clonePayrollCommandState(state.workers),
            publicHolidays: clonePayrollCommandState(state.publicHolidays),
            unrelatedPayroll: clonePayrollCommandState(
                state.payrolls.find(
                    (payroll) => !selectedIds.includes(payroll.id),
                ),
            ),
            unrelatedTimesheet: clonePayrollCommandState(
                state.timesheets.find(
                    (timesheet) => timesheet.id === "timesheet-other-worker",
                ),
            ),
            unrelatedAdvanceRequest: clonePayrollCommandState(
                state.advanceRequests.find(
                    (request) => request.id === "request-other-worker",
                ),
            ),
            unrelatedAdvance: clonePayrollCommandState(
                state.advances.find(
                    (advance) => advance.id === "advance-other-worker",
                ),
            ),
        };
        configureStatefulPayrollCommandDatabase(mocks, state, selectedIds);

        await expect(
            settleDraftPayrolls({ payrollIds: selectedIds }),
        ).resolves.toEqual({
            success: true,
            settled: 2,
            settledPayrollIds: ["payroll-1", "payroll-other-period"],
        });

        expect(state.workers).toEqual(preserved.workers);
        expect(state.publicHolidays).toEqual(preserved.publicHolidays);
        expect(
            state.payrolls.filter((payroll) => selectedIds.includes(payroll.id)),
        ).toEqual([
            expect.objectContaining({ id: "payroll-1", status: "Settled" }),
            expect.objectContaining({
                id: "payroll-other-period",
                status: "Settled",
            }),
        ]);
        expect(
            state.timesheets.filter((timesheet) => timesheet.workerId === "worker-1"),
        ).toEqual([
            expect.objectContaining({
                id: "timesheet-selected",
                status: "Timesheet Paid",
            }),
            expect.objectContaining({
                id: "timesheet-other-period",
                status: "Timesheet Paid",
            }),
        ]);
        expect(
            state.advances.filter((advance) =>
                ["advance-selected", "advance-other-period"].includes(advance.id),
            ),
        ).toEqual([
            expect.objectContaining({
                id: "advance-selected",
                status: "Installment Paid",
            }),
            expect.objectContaining({
                id: "advance-other-period",
                status: "Installment Paid",
            }),
        ]);
        expect(
            state.advanceRequests.filter((request) =>
                ["request-selected", "request-other-period"].includes(request.id),
            ),
        ).toEqual([
            expect.objectContaining({
                id: "request-selected",
                status: "Advance Paid",
            }),
            expect.objectContaining({
                id: "request-other-period",
                status: "Advance Paid",
            }),
        ]);
        expect(
            state.payrolls.find((payroll) => !selectedIds.includes(payroll.id)),
        ).toEqual(preserved.unrelatedPayroll);
        expect(
            state.timesheets.find(
                (timesheet) => timesheet.id === "timesheet-other-worker",
            ),
        ).toEqual(preserved.unrelatedTimesheet);
        expect(
            state.advanceRequests.find(
                (request) => request.id === "request-other-worker",
            ),
        ).toEqual(preserved.unrelatedAdvanceRequest);
        expect(
            state.advances.find((advance) => advance.id === "advance-other-worker"),
        ).toEqual(preserved.unrelatedAdvance);
    });
});
