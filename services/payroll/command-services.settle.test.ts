import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeAdvance, makePayroll } from "@/test/factories/payroll";
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

import { settlePayroll } from "@/services/payroll/settle-payroll";

describe("payroll command services / settlePayroll", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("settlePayroll returns not found when payroll is missing", async () => {
        mocks.db.select.mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([]),
                }),
            }),
        });

        await expect(settlePayroll({ payrollId: "missing" })).resolves.toEqual({
            success: false,
            code: "NOT_FOUND",
            error: "Payroll not found",
        });
    });

    it("settlePayroll settles payroll and updates related records in one transaction", async () => {
        mocks.db.select.mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([makePayroll()]),
                }),
            }),
        });

        const txUpdateWhere = vi.fn().mockResolvedValue(undefined);
        const txUpdateSet = vi.fn().mockReturnValue({ where: txUpdateWhere });
        const txUpdate = vi.fn().mockReturnValue({ set: txUpdateSet });
        const txSelect = vi
            .fn()
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    innerJoin: vi.fn().mockReturnValue({
                        where: vi.fn().mockResolvedValue([
                            makeAdvance({
                                id: "adv-1",
                                advanceRequestId: "req-1",
                                status: "Installment Loan",
                            }),
                        ]),
                    }),
                }),
            })
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([
                        {
                            advanceRequestId: "req-1",
                            status: "Installment Paid" as const,
                        },
                    ]),
                }),
            });

        mocks.db.transaction.mockImplementationOnce(
            async (callback: (tx: unknown) => Promise<void>) =>
                callback({
                    update: txUpdate,
                    select: txSelect,
                }),
        );

        await expect(settlePayroll({ payrollId: "payroll-1" })).resolves.toEqual({
            success: true,
            payrollId: "payroll-1",
        });
        expect(mocks.db.transaction).toHaveBeenCalledTimes(1);
        expect(txUpdate).toHaveBeenCalled();
    });

    it("settlePayroll updates only the selected payroll worker and period while preserving unrelated data", async () => {
        const state = makePayrollCommandState();
        const preserved = {
            workers: clonePayrollCommandState(state.workers),
            publicHolidays: clonePayrollCommandState(state.publicHolidays),
            otherPayrolls: clonePayrollCommandState(state.payrolls.slice(1)),
            otherTimesheets: clonePayrollCommandState(state.timesheets.slice(1)),
            otherAdvanceRequests: clonePayrollCommandState(
                state.advanceRequests.slice(1),
            ),
            otherAdvances: clonePayrollCommandState(state.advances.slice(1)),
        };
        configureStatefulPayrollCommandDatabase(mocks, state, ["payroll-1"]);

        await expect(settlePayroll({ payrollId: "payroll-1" })).resolves.toEqual({
            success: true,
            payrollId: "payroll-1",
        });

        expect(state.workers).toEqual(preserved.workers);
        expect(state.publicHolidays).toEqual(preserved.publicHolidays);
        expect(state.payrolls[0]).toMatchObject({
            id: "payroll-1",
            status: "Settled",
        });
        expect(state.timesheets[0]).toMatchObject({
            id: "timesheet-selected",
            status: "Timesheet Paid",
        });
        expect(state.advanceRequests[0]).toMatchObject({
            id: "request-selected",
            status: "Advance Paid",
        });
        expect(state.advances[0]).toMatchObject({
            id: "advance-selected",
            status: "Installment Paid",
        });
        expect(state.payrolls.slice(1)).toEqual(preserved.otherPayrolls);
        expect(state.timesheets.slice(1)).toEqual(preserved.otherTimesheets);
        expect(state.advanceRequests.slice(1)).toEqual(
            preserved.otherAdvanceRequests,
        );
        expect(state.advances.slice(1)).toEqual(preserved.otherAdvances);
    });
});
