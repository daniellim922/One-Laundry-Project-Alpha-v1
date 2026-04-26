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

import { revertPayroll } from "@/services/payroll/revert-payroll";

describe("payroll command services / revertPayroll", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("revertPayroll rejects Draft payrolls", async () => {
        mocks.db.select.mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([
                        makePayroll({ status: "Draft" }),
                    ]),
                }),
            }),
        });

        await expect(revertPayroll({ payrollId: "payroll-1" })).resolves.toEqual({
            success: false,
            code: "INVALID_STATE",
            error: "Only Settled payrolls can be reverted",
        });
    });

    it("revertPayroll reopens only the selected payroll worker and period while preserving unrelated data", async () => {
        const state = makePayrollCommandState();
        state.payrolls[0]!.status = "Settled";
        state.timesheets[0]!.status = "Timesheet Paid";
        state.advanceRequests[0]!.status = "Advance Paid";
        state.advances[0]!.status = "Installment Paid";
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

        await expect(revertPayroll({ payrollId: "payroll-1" })).resolves.toEqual({
            success: true,
            payrollId: "payroll-1",
        });

        expect(state.workers).toEqual(preserved.workers);
        expect(state.publicHolidays).toEqual(preserved.publicHolidays);
        expect(state.payrolls[0]).toMatchObject({
            id: "payroll-1",
            status: "Draft",
        });
        expect(state.timesheets[0]).toMatchObject({
            id: "timesheet-selected",
            status: "Timesheet Unpaid",
        });
        expect(state.advanceRequests[0]).toMatchObject({
            id: "request-selected",
            status: "Advance Loan",
        });
        expect(state.advances[0]).toMatchObject({
            id: "advance-selected",
            status: "Installment Loan",
        });
        expect(state.payrolls.slice(1)).toEqual(preserved.otherPayrolls);
        expect(state.timesheets.slice(1)).toEqual(preserved.otherTimesheets);
        expect(state.advanceRequests.slice(1)).toEqual(
            preserved.otherAdvanceRequests,
        );
        expect(state.advances.slice(1)).toEqual(preserved.otherAdvances);
    });
});
