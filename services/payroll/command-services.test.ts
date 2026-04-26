import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeAdvance, makePayroll } from "@/test/fixtures/payroll-fixtures";
import { advanceRequestTable } from "@/db/tables/advanceRequestTable";
import { advanceTable } from "@/db/tables/advanceTable";
import { payrollTable } from "@/db/tables/payrollTable";
import { timesheetTable } from "@/db/tables/timesheetTable";

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

import { settlePayroll } from "@/services/payroll/settle-payroll";
import { revertPayroll } from "@/services/payroll/revert-payroll";
import { settleDraftPayrolls } from "@/services/payroll/settle-draft-payrolls";
import { updateVoucherDays } from "@/services/payroll/update-voucher-days";
import { updateVoucherPayRate } from "@/services/payroll/update-voucher-pay-rates";

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

function isDateInPeriod(date: string | null, start: string, end: string) {
    return Boolean(date && date >= start && date <= end);
}

function makePayrollCommandState() {
    return {
        workers: [
            { id: "worker-1", name: "Selected Worker", status: "Active" },
            { id: "worker-2", name: "Other Worker", status: "Active" },
        ],
        publicHolidays: [
            { id: "holiday-1", date: "2026-01-01", name: "New Year's Day" },
        ],
        payrolls: [
            makePayroll({
                id: "payroll-1",
                workerId: "worker-1",
                periodStart: "2026-01-01",
                periodEnd: "2026-01-31",
                status: "Draft",
            }),
            makePayroll({
                id: "payroll-other-worker",
                workerId: "worker-2",
                periodStart: "2026-01-01",
                periodEnd: "2026-01-31",
                status: "Draft",
            }),
            makePayroll({
                id: "payroll-other-period",
                workerId: "worker-1",
                periodStart: "2026-02-01",
                periodEnd: "2026-02-28",
                status: "Draft",
            }),
        ],
        timesheets: [
            {
                id: "timesheet-selected",
                workerId: "worker-1",
                dateIn: "2026-01-15",
                dateOut: "2026-01-15",
                status: "Timesheet Unpaid",
            },
            {
                id: "timesheet-other-worker",
                workerId: "worker-2",
                dateIn: "2026-01-15",
                dateOut: "2026-01-15",
                status: "Timesheet Unpaid",
            },
            {
                id: "timesheet-other-period",
                workerId: "worker-1",
                dateIn: "2026-02-15",
                dateOut: "2026-02-15",
                status: "Timesheet Unpaid",
            },
        ],
        advanceRequests: [
            { id: "request-selected", workerId: "worker-1", status: "Advance Loan" },
            { id: "request-other-worker", workerId: "worker-2", status: "Advance Loan" },
            { id: "request-other-period", workerId: "worker-1", status: "Advance Loan" },
        ],
        advances: [
            makeAdvance({
                id: "advance-selected",
                advanceRequestId: "request-selected",
                repaymentDate: "2026-01-20",
                status: "Installment Loan",
            }),
            makeAdvance({
                id: "advance-other-worker",
                advanceRequestId: "request-other-worker",
                repaymentDate: "2026-01-20",
                status: "Installment Loan",
            }),
            makeAdvance({
                id: "advance-other-period",
                advanceRequestId: "request-other-period",
                repaymentDate: "2026-02-20",
                status: "Installment Loan",
            }),
        ],
    };
}

function configureStatefulPayrollCommandDatabase(
    state: ReturnType<typeof makePayrollCommandState>,
    payrollLookupIds: string[],
) {
    const lookupQueue = [...payrollLookupIds];

    mocks.db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
                limit: vi.fn().mockImplementation(async () => {
                    const id = lookupQueue.shift();
                    return state.payrolls.filter((payroll) => payroll.id === id);
                }),
            }),
        }),
    });

    mocks.db.transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
            let activePayroll = state.payrolls[0]!;
            const payrollUpdateQueue = state.payrolls
                .filter((payroll) => payrollLookupIds.includes(payroll.id))
                .sort((a, b) => a.id.localeCompare(b.id));
            let activeAdvanceRequestIds: string[] = [];
            const select = vi.fn().mockImplementation(() => ({
                from: vi.fn().mockImplementation((table) => {
                    if (table === payrollTable) {
                        return {
                            where: vi.fn().mockResolvedValue(
                                state.payrolls.filter((payroll) =>
                                    payrollLookupIds.includes(payroll.id),
                                ),
                            ),
                        };
                    }

                    if (table === advanceTable) {
                        return {
                            innerJoin: vi.fn().mockReturnValue({
                                where: vi.fn().mockImplementation(async () => {
                                    const rows = state.advances.filter((advance) => {
                                        const request = state.advanceRequests.find(
                                            (row) => row.id === advance.advanceRequestId,
                                        );
                                        return (
                                            request?.workerId === activePayroll.workerId &&
                                            isDateInPeriod(
                                                advance.repaymentDate,
                                                activePayroll.periodStart,
                                                activePayroll.periodEnd,
                                            )
                                        );
                                    });
                                    activeAdvanceRequestIds = rows.map(
                                        (advance) => advance.advanceRequestId,
                                    );
                                    return rows;
                                }),
                            }),
                            where: vi.fn().mockResolvedValue(
                                state.advances.filter((advance) =>
                                    activeAdvanceRequestIds.includes(
                                        advance.advanceRequestId,
                                    ),
                                ),
                            ),
                        };
                    }

                    throw new Error("Unexpected select table in payroll command test");
                }),
            }));

            const update = vi.fn().mockImplementation((table) => ({
                set: vi.fn().mockImplementation((values) => ({
                    where: vi.fn().mockImplementation(async () => {
                        if (table === payrollTable) {
                            activePayroll = payrollUpdateQueue.shift() ?? activePayroll;
                            Object.assign(activePayroll, values);
                            return;
                        }

                        if (table === advanceTable) {
                            for (const advance of state.advances) {
                                const request = state.advanceRequests.find(
                                    (row) => row.id === advance.advanceRequestId,
                                );
                                if (
                                    request?.workerId === activePayroll.workerId &&
                                    isDateInPeriod(
                                        advance.repaymentDate,
                                        activePayroll.periodStart,
                                        activePayroll.periodEnd,
                                    )
                                ) {
                                    Object.assign(advance, values);
                                }
                            }
                            return;
                        }

                        if (table === advanceRequestTable) {
                            for (const request of state.advanceRequests) {
                                if (activeAdvanceRequestIds.includes(request.id)) {
                                    Object.assign(request, values);
                                }
                            }
                            return;
                        }

                        if (table === timesheetTable) {
                            for (const timesheet of state.timesheets) {
                                if (
                                    timesheet.workerId === activePayroll.workerId &&
                                    isDateInPeriod(
                                        timesheet.dateIn,
                                        activePayroll.periodStart,
                                        activePayroll.periodEnd,
                                    )
                                ) {
                                    Object.assign(timesheet, values);
                                }
                            }
                        }
                    }),
                })),
            }));

            return callback({ select, update });
        },
    );
}

describe("payroll command services", () => {
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
            workers: clone(state.workers),
            publicHolidays: clone(state.publicHolidays),
            otherPayrolls: clone(state.payrolls.slice(1)),
            otherTimesheets: clone(state.timesheets.slice(1)),
            otherAdvanceRequests: clone(state.advanceRequests.slice(1)),
            otherAdvances: clone(state.advances.slice(1)),
        };
        configureStatefulPayrollCommandDatabase(state, ["payroll-1"]);

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
            workers: clone(state.workers),
            publicHolidays: clone(state.publicHolidays),
            otherPayrolls: clone(state.payrolls.slice(1)),
            otherTimesheets: clone(state.timesheets.slice(1)),
            otherAdvanceRequests: clone(state.advanceRequests.slice(1)),
            otherAdvances: clone(state.advances.slice(1)),
        };
        configureStatefulPayrollCommandDatabase(state, ["payroll-1"]);

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
            workers: clone(state.workers),
            publicHolidays: clone(state.publicHolidays),
            unrelatedPayroll: clone(
                state.payrolls.find(
                    (payroll) => !selectedIds.includes(payroll.id),
                ),
            ),
            unrelatedTimesheet: clone(
                state.timesheets.find(
                    (timesheet) => timesheet.id === "timesheet-other-worker",
                ),
            ),
            unrelatedAdvanceRequest: clone(
                state.advanceRequests.find(
                    (request) => request.id === "request-other-worker",
                ),
            ),
            unrelatedAdvance: clone(
                state.advances.find(
                    (advance) => advance.id === "advance-other-worker",
                ),
            ),
        };
        configureStatefulPayrollCommandDatabase(state, selectedIds);

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

    it("updateVoucherDays recalculates and persists voucher totals for Draft payrolls", async () => {
        mocks.db.select
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([
                            {
                                status: "Draft",
                                payrollVoucherId: "voucher-1",
                            },
                        ]),
                    }),
                }),
            })
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([
                            {
                                employmentType: "Full Time",
                                totalHoursWorked: 200,
                                minimumWorkingHours: 180,
                                monthlyPay: 0,
                                hourlyRate: 10,
                                restDayRate: 12,
                                cpf: 5,
                                advance: 20,
                            },
                        ]),
                    }),
                }),
            });

        const updateWhere = vi.fn().mockResolvedValue(undefined);
        const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
        mocks.db.update.mockReturnValue({
            set: updateSet,
        });

        await expect(
            updateVoucherDays({
                payrollId: "payroll-1",
                voucherId: "voucher-1",
                restDays: 4,
                publicHolidays: 1,
            }),
        ).resolves.toEqual({
            success: true,
            payrollId: "payroll-1",
            voucherId: "voucher-1",
        });
        expect(mocks.db.update).toHaveBeenCalledTimes(1);
        expect(updateSet).toHaveBeenCalledWith(
            expect.objectContaining({
                restDays: 4,
                publicHolidays: 1,
                subTotal: expect.any(Number),
                grandTotal: expect.any(Number),
            }),
        );
    });

    it("updateVoucherPayRate recalculates and persists voucher for Draft payrolls", async () => {
        mocks.db.select
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([
                            {
                                status: "Draft",
                                payrollVoucherId: "voucher-1",
                            },
                        ]),
                    }),
                }),
            })
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([
                            {
                                employmentType: "Full Time",
                                employmentArrangement: "Local Worker",
                                totalHoursWorked: 200,
                                minimumWorkingHours: 180,
                                monthlyPay: 3000,
                                hourlyRate: 10,
                                restDayRate: 12,
                                cpf: 5,
                                advance: 20,
                                restDays: 2,
                                publicHolidays: 1,
                                paymentMethod: "Cash",
                                payNowPhone: null,
                                bankAccountNumber: null,
                            },
                        ]),
                    }),
                }),
            });

        const updateWhere = vi.fn().mockResolvedValue(undefined);
        const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
        mocks.db.update.mockReturnValue({
            set: updateSet,
        });

        await expect(
            updateVoucherPayRate({
                payrollId: "payroll-1",
                voucherId: "voucher-1",
                field: "monthlyPay",
                value: 4000,
            }),
        ).resolves.toEqual({
            success: true,
            payrollId: "payroll-1",
            voucherId: "voucher-1",
        });
        expect(mocks.db.update).toHaveBeenCalledTimes(1);
        expect(updateSet).toHaveBeenCalledWith(
            expect.objectContaining({
                monthlyPay: 4000,
                subTotal: expect.any(Number),
                grandTotal: expect.any(Number),
            }),
        );
    });

    it("updateVoucherPayRate updates minimum working hours and recalculates", async () => {
        mocks.db.select
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([
                            {
                                status: "Draft",
                                payrollVoucherId: "voucher-1",
                            },
                        ]),
                    }),
                }),
            })
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([
                            {
                                employmentType: "Full Time",
                                employmentArrangement: "Local Worker",
                                totalHoursWorked: 200,
                                minimumWorkingHours: 180,
                                monthlyPay: 3000,
                                hourlyRate: 10,
                                restDayRate: 12,
                                cpf: 5,
                                advance: 20,
                                restDays: 2,
                                publicHolidays: 1,
                                paymentMethod: "Cash",
                                payNowPhone: null,
                                bankAccountNumber: null,
                            },
                        ]),
                    }),
                }),
            });

        const updateWhere = vi.fn().mockResolvedValue(undefined);
        const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
        mocks.db.update.mockReturnValue({
            set: updateSet,
        });

        await expect(
            updateVoucherPayRate({
                payrollId: "payroll-1",
                voucherId: "voucher-1",
                field: "minimumWorkingHours",
                value: 260,
            }),
        ).resolves.toEqual({
            success: true,
            payrollId: "payroll-1",
            voucherId: "voucher-1",
        });
        expect(updateSet).toHaveBeenCalledWith(
            expect.objectContaining({
                minimumWorkingHours: 260,
                subTotal: expect.any(Number),
                grandTotal: expect.any(Number),
            }),
        );
    });

    it("updateVoucherPayRate allows null minimum working hours and recalculates", async () => {
        mocks.db.select
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([
                            {
                                status: "Draft",
                                payrollVoucherId: "voucher-1",
                            },
                        ]),
                    }),
                }),
            })
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([
                            {
                                employmentType: "Full Time",
                                employmentArrangement: "Local Worker",
                                totalHoursWorked: 200,
                                minimumWorkingHours: 180,
                                monthlyPay: 3000,
                                hourlyRate: 10,
                                restDayRate: 12,
                                cpf: 5,
                                advance: 20,
                                restDays: 2,
                                publicHolidays: 1,
                                paymentMethod: "Cash",
                                payNowPhone: null,
                                bankAccountNumber: null,
                            },
                        ]),
                    }),
                }),
            });

        const updateWhere = vi.fn().mockResolvedValue(undefined);
        const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
        mocks.db.update.mockReturnValue({
            set: updateSet,
        });

        await expect(
            updateVoucherPayRate({
                payrollId: "payroll-1",
                voucherId: "voucher-1",
                field: "minimumWorkingHours",
                value: null,
            }),
        ).resolves.toEqual({
            success: true,
            payrollId: "payroll-1",
            voucherId: "voucher-1",
        });
        expect(updateSet).toHaveBeenCalledWith(
            expect.objectContaining({
                minimumWorkingHours: null,
                subTotal: expect.any(Number),
                grandTotal: expect.any(Number),
            }),
        );
    });
});
