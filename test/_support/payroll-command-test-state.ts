import { vi } from "vitest";

import { makeAdvance, makePayroll } from "@/test/factories/payroll";
import { advanceRequestTable } from "@/db/tables/advanceRequestTable";
import { advanceTable } from "@/db/tables/advanceTable";
import { payrollTable } from "@/db/tables/payrollTable";
import { timesheetTable } from "@/db/tables/timesheetTable";

export type PayrollCommandDbMocks = {
    db: {
        select: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        transaction: ReturnType<typeof vi.fn>;
    };
};

export function clonePayrollCommandState<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

function isDateInPeriod(date: string | null, start: string, end: string) {
    return Boolean(date && date >= start && date <= end);
}

export function makePayrollCommandState() {
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

export function configureStatefulPayrollCommandDatabase(
    dbMocks: PayrollCommandDbMocks,
    state: ReturnType<typeof makePayrollCommandState>,
    payrollLookupIds: string[],
) {
    const lookupQueue = [...payrollLookupIds];

    dbMocks.db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
                limit: vi.fn().mockImplementation(async () => {
                    const id = lookupQueue.shift();
                    return state.payrolls.filter((payroll) => payroll.id === id);
                }),
            }),
        }),
    });

    dbMocks.db.transaction.mockImplementation(
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
