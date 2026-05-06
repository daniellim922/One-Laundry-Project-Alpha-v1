import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    synchronizeWorkerDraftPayrolls: vi.fn(),
    recordGuidedMonthlyWorkflowStepCompletion: vi.fn(),
    db: {
        select: vi.fn(),
        insert: vi.fn(),
    },
}));

vi.mock("@/lib/db", () => ({
    db: mocks.db,
}));

vi.mock("@/services/payroll/synchronize-worker-draft-payrolls", () => ({
    synchronizeWorkerDraftPayrolls: (...args: unknown[]) =>
        mocks.synchronizeWorkerDraftPayrolls(...args),
}));
vi.mock("@/services/payroll/guided-monthly-workflow-activity", () => ({
    recordGuidedMonthlyWorkflowStepCompletion: (...args: unknown[]) =>
        mocks.recordGuidedMonthlyWorkflowStepCompletion(...args),
}));

import { importAttendRecordTimesheet } from "@/services/timesheet/import-attend-record-timesheet";
import { timesheetTable } from "@/db/tables/timesheetTable";
import { workerTable } from "@/db/tables/workerTable";
import {
    deepCloneJson,
    makeAttendRecordPayload,
    makeImportOperationalState,
} from "@/test/factories/attendrecord";

function makeInsertChainResult(rows: { workerId: string }[]) {
    return {
        onConflictDoNothing: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue(
                rows.map((row, i) => ({
                    id: `inserted-${i}`,
                    workerId: row.workerId,
                })),
            ),
        }),
    };
}

function mockWorkerSelectRows(
    rows: {
        id: string;
        name: string;
        status: string;
        shiftPattern?: string;
    }[],
) {
    return rows.map((row) => ({
        ...row,
        shiftPattern: row.shiftPattern ?? "Day Shift",
    }));
}

function configureDefaultWorkersSelect() {
    mocks.db.select.mockImplementation(() => ({
        from: vi.fn((table: unknown) => {
            if (table === timesheetTable) {
                return {
                    where: vi.fn().mockResolvedValue([]),
                };
            }
            if (table === workerTable) {
                return {
                    innerJoin: vi.fn().mockReturnValue(
                        Promise.resolve(
                            mockWorkerSelectRows([
                                {
                                    id: "worker-1",
                                    name: "Worker One",
                                    status: "Active",
                                },
                                {
                                    id: "worker-2",
                                    name: "Worker Two",
                                    status: "Active",
                                },
                            ]),
                        ),
                    ),
                };
            }
            throw new Error("Unexpected table in select mock");
        }),
    }));
}

function configureStatefulImportDatabase(
    state: ReturnType<typeof makeImportOperationalState>,
) {
    mocks.db.select.mockImplementation(() => ({
        from: vi.fn((table: unknown) => {
            if (table === timesheetTable) {
                return {
                    where: vi.fn().mockResolvedValue([]),
                };
            }
            if (table === workerTable) {
                return {
                    innerJoin: vi.fn().mockReturnValue(
                        Promise.resolve(mockWorkerSelectRows(state.workers)),
                    ),
                };
            }
            throw new Error("Unexpected table in select mock");
        }),
    }));
    mocks.db.insert.mockImplementation((table) => {
        if (table !== timesheetTable) {
            throw new Error("Timesheet import should only insert timesheet rows");
        }

        return {
            values: vi.fn().mockImplementation((rows: Record<string, unknown>[]) => {
                const baseLen = state.timesheets.length;
                const inserted = rows.map((row, index: number) => ({
                    id: `imported-timesheet-${baseLen + index + 1}`,
                    workerId: row.workerId as string,
                    dateIn: row.dateIn as string,
                    timeIn: row.timeIn as string,
                    dateOut: row.dateOut as string,
                    timeOut: row.timeOut as string,
                    status: "Timesheet Unpaid",
                }));
                return {
                    onConflictDoNothing: vi.fn().mockReturnValue({
                        returning: vi.fn().mockImplementation(async () => {
                            state.timesheets.push(...inserted);
                            return inserted.map((r) => ({
                                id: r.id as string,
                                workerId: r.workerId as string,
                            }));
                        }),
                    }),
                };
            }),
        };
    });
}

describe("services/timesheet/import-attend-record-timesheet", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        configureDefaultWorkersSelect();
        mocks.db.insert.mockImplementation(() => ({
            values: vi.fn().mockImplementation((rows: { workerId: string }[]) =>
                makeInsertChainResult(rows),
            ),
        }));
        mocks.synchronizeWorkerDraftPayrolls.mockResolvedValue({ success: true });
    });

    it("imports rows and synchronizes each affected worker once", async () => {
        await expect(
            importAttendRecordTimesheet(makeAttendRecordPayload()),
        ).resolves.toEqual({
            status: "success",
            imported: 3,
            skipped: 0,
            errors: undefined,
        });

        expect(
            mocks.db.insert.mock.results[0]?.value.values,
        ).toHaveBeenCalledWith([
            expect.not.objectContaining({ hours: expect.anything() }),
            expect.not.objectContaining({ hours: expect.anything() }),
            expect.not.objectContaining({ hours: expect.anything() }),
        ]);
        expect(mocks.synchronizeWorkerDraftPayrolls).toHaveBeenCalledTimes(2);
        expect(mocks.synchronizeWorkerDraftPayrolls).toHaveBeenNthCalledWith(1, {
            workerId: "worker-1",
        });
        expect(mocks.synchronizeWorkerDraftPayrolls).toHaveBeenNthCalledWith(2, {
            workerId: "worker-2",
        });
        expect(
            mocks.recordGuidedMonthlyWorkflowStepCompletion,
        ).toHaveBeenCalledWith({
            stepId: "timesheet_import",
        });
    });

    it("returns synchronization failures in the import error list", async () => {
        mocks.synchronizeWorkerDraftPayrolls
            .mockResolvedValueOnce({ success: true })
            .mockResolvedValueOnce({
                error: "Failed to synchronize Draft payrolls",
            });

        await expect(
            importAttendRecordTimesheet(makeAttendRecordPayload()),
        ).resolves.toEqual({
            status: "success",
            imported: 3,
            skipped: 0,
            errors: ["Failed to synchronize Draft payrolls"],
        });
    });

    it("returns a clear error when the import includes an inactive worker", async () => {
        mocks.db.select.mockImplementation(() => ({
            from: vi.fn((table: unknown) => {
                if (table === timesheetTable) {
                    return {
                        where: vi.fn().mockResolvedValue([]),
                    };
                }
                if (table === workerTable) {
                    return {
                        innerJoin: vi.fn().mockReturnValue(
                            Promise.resolve(
                                mockWorkerSelectRows([
                                    {
                                        id: "worker-1",
                                        name: "Worker One",
                                        status: "Inactive",
                                    },
                                    {
                                        id: "worker-2",
                                        name: "Worker Two",
                                        status: "Active",
                                    },
                                ]),
                            ),
                        ),
                    };
                }
                throw new Error("Unexpected table in select mock");
            }),
        }));

        await expect(
            importAttendRecordTimesheet(makeAttendRecordPayload()),
        ).resolves.toEqual({
            status: "success",
            imported: 1,
            skipped: 0,
            errors: [
                "Cannot import timesheet for Worker One because worker status is Inactive",
            ],
        });

        expect(mocks.synchronizeWorkerDraftPayrolls).toHaveBeenCalledTimes(1);
        expect(mocks.synchronizeWorkerDraftPayrolls).toHaveBeenCalledWith({
            workerId: "worker-2",
        });
    });

    it("adds matched AttendRecord rows while preserving existing operational records", async () => {
        const state = makeImportOperationalState();
        const preserved = {
            workers: deepCloneJson(state.workers),
            existingTimesheet: deepCloneJson(state.timesheets[0]),
            payrolls: deepCloneJson(state.payrolls),
            advances: deepCloneJson(state.advances),
            publicHolidays: deepCloneJson(state.publicHolidays),
        };
        configureStatefulImportDatabase(state);

        await expect(
            importAttendRecordTimesheet({
                attendanceDate: {
                    startDate: "01/01/2026",
                    endDate: "01/01/2026",
                },
                tablingDate: "01/01/2026 17:10:10",
                workers: [
                    {
                        userId: "",
                        name: "Worker One",
                        dates: [
                            {
                                dateIn: "01/01/2026",
                                timeIn: "09:00",
                                dateOut: "01/01/2026",
                                timeOut: "17:00",
                            },
                        ],
                    },
                ],
            }),
        ).resolves.toEqual({
            status: "success",
            imported: 1,
            skipped: 0,
            errors: undefined,
        });

        expect(state.workers).toEqual(preserved.workers);
        expect(state.payrolls).toEqual(preserved.payrolls);
        expect(state.advances).toEqual(preserved.advances);
        expect(state.publicHolidays).toEqual(preserved.publicHolidays);
        expect(state.timesheets).toHaveLength(2);
        expect(state.timesheets[0]).toEqual(preserved.existingTimesheet);
        expect(state.timesheets[1]).toMatchObject({
            workerId: "worker-1",
            dateIn: "2026-01-01",
            timeIn: "09:00:00",
            dateOut: "2026-01-01",
            timeOut: "17:00:00",
        });
    });

    it("reports unmatched or invalid AttendRecord rows without deleting unrelated data", async () => {
        const state = makeImportOperationalState();
        const preserved = deepCloneJson(state);
        configureStatefulImportDatabase(state);

        await expect(
            importAttendRecordTimesheet({
                attendanceDate: {
                    startDate: "01/01/2026",
                    endDate: "02/01/2026",
                },
                tablingDate: "02/01/2026 17:10:10",
                workers: [
                    {
                        userId: "",
                        name: "Unknown Worker",
                        dates: [
                            {
                                dateIn: "01/01/2026",
                                timeIn: "09:00",
                                dateOut: "01/01/2026",
                                timeOut: "17:00",
                            },
                        ],
                    },
                    {
                        userId: "",
                        name: "Worker One",
                        dates: [
                            {
                                dateIn: "not-a-date",
                                timeIn: "09:00",
                                dateOut: "02/01/2026",
                                timeOut: "17:00",
                            },
                        ],
                    },
                ],
            }),
        ).resolves.toEqual({
            status: "success",
            imported: 0,
            skipped: 0,
            errors: [
                'Unknown worker "Unknown Worker"',
                "Invalid date for Worker One: not-a-date",
            ],
        });

        expect(state).toEqual(preserved);
        expect(mocks.recordGuidedMonthlyWorkflowStepCompletion).not.toHaveBeenCalled();
        expect(mocks.synchronizeWorkerDraftPayrolls).not.toHaveBeenCalled();
    });

    it("returns confirmation_required when timesheets already exist for imported worker/date pairs", async () => {
        mocks.db.select.mockImplementation(() => ({
            from: vi.fn((table: unknown) => {
                if (table === timesheetTable) {
                    return {
                        where: vi.fn().mockResolvedValue([
                            {
                                workerId: "worker-1",
                                dateIn: "2026-01-01",
                                timeIn: "08:00:00",
                            },
                        ]),
                    };
                }
                if (table === workerTable) {
                    return {
                        innerJoin: vi.fn().mockReturnValue(
                            Promise.resolve(
                                mockWorkerSelectRows([
                                    {
                                        id: "worker-1",
                                        name: "Worker One",
                                        status: "Active",
                                    },
                                ]),
                            ),
                        ),
                    };
                }
                throw new Error("Unexpected table in select mock");
            }),
        }));

        await expect(
            importAttendRecordTimesheet({
                attendanceDate: {
                    startDate: "01/01/2026",
                    endDate: "01/01/2026",
                },
                tablingDate: "01/01/2026 17:10:10",
                workers: [
                    {
                        userId: "",
                        name: "Worker One",
                        dates: [
                            {
                                dateIn: "01/01/2026",
                                timeIn: "09:00",
                                dateOut: "01/01/2026",
                                timeOut: "17:00",
                            },
                        ],
                    },
                ],
            }),
        ).resolves.toEqual({
            status: "confirmation_required",
            overlaps: [
                {
                    workerName: "Worker One",
                    dateIn: "2026-01-01",
                    existingCount: 1,
                },
            ],
        });

        expect(mocks.db.insert).not.toHaveBeenCalled();
    });

    it("skips overlapping worker/date rows when mode is skip", async () => {
        mocks.db.select.mockImplementation(() => ({
            from: vi.fn((table: unknown) => {
                if (table === timesheetTable) {
                    return {
                        where: vi.fn().mockResolvedValue([
                            {
                                workerId: "worker-1",
                                dateIn: "2026-01-01",
                                timeIn: "08:00:00",
                            },
                        ]),
                    };
                }
                if (table === workerTable) {
                    return {
                        innerJoin: vi.fn().mockReturnValue(
                            Promise.resolve(
                                mockWorkerSelectRows([
                                    {
                                        id: "worker-1",
                                        name: "Worker One",
                                        status: "Active",
                                    },
                                ]),
                            ),
                        ),
                    };
                }
                throw new Error("Unexpected table in select mock");
            }),
        }));

        await expect(
            importAttendRecordTimesheet(
                {
                    attendanceDate: {
                        startDate: "01/01/2026",
                        endDate: "02/01/2026",
                    },
                    tablingDate: "02/01/2026 17:10:10",
                    workers: [
                        {
                            userId: "",
                            name: "Worker One",
                            dates: [
                                {
                                    dateIn: "01/01/2026",
                                    timeIn: "09:00",
                                    dateOut: "01/01/2026",
                                    timeOut: "17:00",
                                },
                                {
                                    dateIn: "02/01/2026",
                                    timeIn: "09:00",
                                    dateOut: "02/01/2026",
                                    timeOut: "17:00",
                                },
                            ],
                        },
                    ],
                },
                { mode: "skip" },
            ),
        ).resolves.toEqual({
            status: "success",
            imported: 1,
            skipped: 1,
            errors: undefined,
        });
    });

    it("re-pairs AttendRecord cells for Night Shift employment before inserting timesheets", async () => {
        const state = makeImportOperationalState();
        state.workers[0]!.shiftPattern = "Night Shift";
        configureStatefulImportDatabase(state);

        await expect(
            importAttendRecordTimesheet({
                attendanceDate: {
                    startDate: "01/04/2026",
                    endDate: "02/04/2026",
                },
                tablingDate: "02/04/2026 17:10:10",
                workers: [
                    {
                        userId: "",
                        name: "Worker One",
                        dates: [
                            {
                                dateIn: "01/04/2026",
                                timeIn: "08:00",
                                dateOut: "01/04/2026",
                                timeOut: "20:00",
                            },
                            {
                                dateIn: "02/04/2026",
                                timeIn: "08:00",
                                dateOut: "02/04/2026",
                                timeOut: "     ",
                            },
                        ],
                    },
                ],
            }),
        ).resolves.toEqual({
            status: "success",
            imported: 1,
            skipped: 0,
            errors: undefined,
        });

        expect(state.timesheets).toHaveLength(2);
        expect(state.timesheets[1]).toMatchObject({
            workerId: "worker-1",
            dateIn: "2026-04-01",
            timeIn: "20:00:00",
            dateOut: "2026-04-02",
            timeOut: "08:00:00",
        });
    });
});
