import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    revalidatePath: vi.fn(),
    findPayrollPeriodConflicts: vi.fn(),
    getAdvancesForPayrollPeriod: vi.fn(),
    recordGuidedMonthlyWorkflowStepCompletion: vi.fn(),
    db: {
        select: vi.fn(),
        transaction: vi.fn(),
    },
}));

vi.mock("next/cache", () => ({
    revalidatePath: (...args: unknown[]) => mocks.revalidatePath(...args),
}));

vi.mock("@/lib/db", () => ({
    db: mocks.db,
}));

vi.mock("@/utils/advance/queries", () => ({
    getAdvancesForPayrollPeriod: (...args: unknown[]) =>
        mocks.getAdvancesForPayrollPeriod(...args),
}));
vi.mock("@/services/payroll/guided-monthly-workflow-activity", () => ({
    recordGuidedMonthlyWorkflowStepCompletion: (...args: unknown[]) =>
        mocks.recordGuidedMonthlyWorkflowStepCompletion(...args),
}));

vi.mock("@/utils/payroll/payroll-period-conflicts", async () => {
    const actual =
        await vi.importActual<
            typeof import("@/utils/payroll/payroll-period-conflicts")
        >("@/utils/payroll/payroll-period-conflicts");
    return {
        ...actual,
        findPayrollPeriodConflicts: (...args: unknown[]) =>
            mocks.findPayrollPeriodConflicts(...args),
    };
});

import {
    createPayrollRecord,
    createPayrollRecords,
    updatePayrollRecord,
} from "@/services/payroll/save-payroll";
import { payrollTable } from "@/db/tables/payrollTable";
import { payrollVoucherCounterTable } from "@/db/tables/payrollVoucherCounterTable";
import { payrollVoucherTable } from "@/db/tables/payrollVoucherTable";
import {
    drizzleMockSelectJoinLimitResolved,
    drizzleMockSelectLimitResolved,
} from "@/test/_support/drizzle-mocks";

function mockSelectWithLimitResolved(value: unknown) {
    drizzleMockSelectLimitResolved(mocks.db.select, value);
}

function mockSelectWithJoinLimitResolved(value: unknown) {
    drizzleMockSelectJoinLimitResolved(mocks.db.select, value);
}

function createPayrollInsertExecutor(insertedVoucherValues: unknown[]) {
    const counters = new Map<number, number>();
    let payrollInsertSeq = 0;

    return vi.fn((table) => {
        if (table === payrollVoucherCounterTable) {
            return {
                values: vi.fn().mockImplementation((values: { year: number }) => {
                    const nextValue = (counters.get(values.year) ?? 0) + 1;
                    counters.set(values.year, nextValue);

                    return {
                        onConflictDoUpdate: vi.fn().mockReturnValue({
                            returning: vi
                                .fn()
                                .mockResolvedValue([{ currentValue: nextValue }]),
                        }),
                    };
                }),
            };
        }

        if (table === payrollVoucherTable) {
            return {
                values: vi.fn().mockImplementation((values) => {
                    insertedVoucherValues.push(values);

                    return {
                        returning: vi
                            .fn()
                            .mockResolvedValue([{ id: "voucher-created" }]),
                    };
                }),
            };
        }

        if (table === payrollTable) {
            return {
                values: vi.fn().mockReturnValue({
                    returning: vi.fn().mockResolvedValue([
                        { id: `payroll-mock-${++payrollInsertSeq}` },
                    ]),
                }),
            };
        }

        throw new Error("Unexpected table insert in test");
    });
}

describe("payroll overlap action handling", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns an error when creating payroll for an inactive worker", async () => {
        mockSelectWithJoinLimitResolved([
            {
                worker: {
                    id: "worker-1",
                    name: "Alicia",
                    status: "Inactive",
                },
                employment: {},
            },
        ]);

        const result = await createPayrollRecord({
            workerId: "worker-1",
            periodStart: "2026-03-01",
            periodEnd: "2026-03-31",
            payrollDate: "2026-04-05",
        });

        expect(result).toEqual({
            error: expect.stringContaining("Inactive"),
        });
        expect(mocks.findPayrollPeriodConflicts).not.toHaveBeenCalled();
        expect(mocks.db.transaction).not.toHaveBeenCalled();
    });

    it("includes the worker name and status in the inactive payroll error", async () => {
        mockSelectWithJoinLimitResolved([
            {
                worker: {
                    id: "worker-1",
                    name: "Alicia",
                    status: "Inactive",
                },
                employment: {},
            },
        ]);

        const result = await createPayrollRecord({
            workerId: "worker-1",
            periodStart: "2026-03-01",
            periodEnd: "2026-03-31",
            payrollDate: "2026-04-05",
        });

        expect(result).toEqual({
            error: "Cannot create payroll for Alicia because worker status is Inactive",
        });
    });

    it("returns validation error when period range is reversed", async () => {
        const fd = new FormData();
        fd.append("workerId", "worker-1");
        fd.set("periodStart", "2026-03-31");
        fd.set("periodEnd", "2026-03-01");
        fd.set("payrollDate", "2026-04-05");

        const result = await createPayrollRecords({
            workerIds: fd.getAll("workerId") as string[],
            periodStart: fd.get("periodStart") as string,
            periodEnd: fd.get("periodEnd") as string,
            payrollDate: fd.get("payrollDate") as string,
        });

        expect(result).toEqual({
            error: "Period end must be on or after period start",
        });
        expect(mocks.db.select).not.toHaveBeenCalled();
    });

    it("returns validation error when payrollDate is before periodEnd", async () => {
        const fd = new FormData();
        fd.append("workerId", "worker-1");
        fd.set("periodStart", "2026-03-01");
        fd.set("periodEnd", "2026-03-31");
        fd.set("payrollDate", "2026-03-30");

        const result = await createPayrollRecords({
            workerIds: fd.getAll("workerId") as string[],
            periodStart: fd.get("periodStart") as string,
            periodEnd: fd.get("periodEnd") as string,
            payrollDate: fd.get("payrollDate") as string,
        });

        expect(result).toEqual({
            error: "Payroll date must be on or after period end",
        });
        expect(mocks.db.select).not.toHaveBeenCalled();
    });

    it("returns partial-success payload for batch overlap conflicts", async () => {
        const conflict = {
            payrollId: "payroll-existing-1",
            workerId: "worker-1",
            workerName: "Alicia",
            periodStart: "2026-03-01",
            periodEnd: "2026-03-31",
            status: "Draft" as const,
        };

        mockSelectWithJoinLimitResolved([
            {
                worker: {
                    id: "worker-1",
                    name: "Alicia",
                    status: "Active",
                },
                employment: {},
            },
        ]);
        mocks.findPayrollPeriodConflicts.mockResolvedValueOnce([conflict]);

        const fd = new FormData();
        fd.append("workerId", "worker-1");
        fd.set("periodStart", "2026-03-01");
        fd.set("periodEnd", "2026-03-31");
        fd.set("payrollDate", "2026-04-05");

        const result = await createPayrollRecords({
            workerIds: fd.getAll("workerId") as string[],
            periodStart: fd.get("periodStart") as string,
            periodEnd: fd.get("periodEnd") as string,
            payrollDate: fd.get("payrollDate") as string,
        });

        expect(result).toEqual({
            success: true,
            created: 0,
            skipped: 1,
            conflicts: [conflict],
            createdPayrolls: [],
        });
        expect(mocks.db.transaction).not.toHaveBeenCalled();
        expect(mocks.revalidatePath).not.toHaveBeenCalled();
        expect(
            mocks.recordGuidedMonthlyWorkflowStepCompletion,
        ).not.toHaveBeenCalled();
    });

    it("creates a draft payroll for an active worker with computed cross-year public holidays", async () => {
        const txSelect = vi
            .fn()
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([
                        {
                            dateIn: "2025-12-31",
                            dateOut: "2025-12-31",
                            hours: "8",
                        },
                        {
                            dateIn: "2026-01-01",
                            dateOut: "2026-01-01",
                            hours: "8",
                        },
                    ]),
                }),
            })
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([
                        { date: "2025-12-31" },
                        { date: "2026-01-01" },
                        { date: "2026-01-02" },
                    ]),
                }),
            });
        const insertedVoucherValues: Array<Record<string, unknown>> = [];
        mockSelectWithJoinLimitResolved([
            {
                worker: {
                    id: "worker-1",
                    name: "Alicia",
                    status: "Active",
                },
                employment: {
                    employmentType: "Full Time",
                    employmentArrangement: "Local Worker",
                    minimumWorkingHours: 16,
                    monthlyPay: 2000,
                    hourlyRate: 10,
                    restDayRate: 25,
                    cpf: 0,
                    paymentMethod: "Cash",
                    payNowPhone: null,
                    bankAccountNumber: null,
                },
            },
        ]);
        mocks.findPayrollPeriodConflicts.mockResolvedValueOnce([]);
        mocks.getAdvancesForPayrollPeriod.mockResolvedValueOnce([]);
        mocks.db.transaction.mockImplementationOnce(
            async (callback: (tx: unknown) => Promise<void>) =>
                callback({
                    select: txSelect,
                    insert: createPayrollInsertExecutor(insertedVoucherValues),
                }),
        );

        const result = await createPayrollRecord({
            workerId: "worker-1",
            periodStart: "2025-12-31",
            periodEnd: "2026-01-02",
            payrollDate: "2026-01-05",
        });

        expect(result).toEqual({ success: true });
        expect(insertedVoucherValues).toHaveLength(1);
        expect(insertedVoucherValues[0]).toEqual(
            expect.objectContaining({
                publicHolidays: 2,
                publicHolidayPay: 50,
            }),
        );
        expect(
            mocks.recordGuidedMonthlyWorkflowStepCompletion,
        ).toHaveBeenCalledWith({
            stepId: "payroll_creation",
        });
    });

    it("records guided monthly workflow completion after batch payroll creation", async () => {
        const txSelect = vi
            .fn()
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([]),
                }),
            })
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([]),
                }),
            });
        const insertedVoucherValues: Array<Record<string, unknown>> = [];

        mockSelectWithJoinLimitResolved([
            {
                worker: {
                    id: "worker-1",
                    name: "Alicia",
                    status: "Active",
                },
                employment: {
                    employmentType: "Full Time",
                    employmentArrangement: "Local Worker",
                    minimumWorkingHours: 16,
                    monthlyPay: 2000,
                    hourlyRate: 10,
                    restDayRate: 25,
                    cpf: 0,
                    paymentMethod: "Cash",
                    payNowPhone: null,
                    bankAccountNumber: null,
                },
            },
        ]);
        mocks.findPayrollPeriodConflicts.mockResolvedValueOnce([]);
        mocks.getAdvancesForPayrollPeriod.mockResolvedValueOnce([]);
        mocks.db.transaction.mockImplementationOnce(
            async (callback: (tx: unknown) => Promise<void>) =>
                callback({
                    select: txSelect,
                    insert: createPayrollInsertExecutor(insertedVoucherValues),
                }),
        );

        const result = await createPayrollRecords({
            workerIds: ["worker-1"],
            periodStart: "2026-01-01",
            periodEnd: "2026-01-31",
            payrollDate: "2026-02-05",
        });

        expect(result).toEqual({
            success: true,
            created: 1,
            skipped: 0,
            conflicts: [],
            createdPayrolls: [
                { payrollId: "payroll-mock-1", workerId: "worker-1" },
            ],
        });
        expect(
            mocks.recordGuidedMonthlyWorkflowStepCompletion,
        ).toHaveBeenCalledWith({
            stepId: "payroll_creation",
        });
    });

    it("creates payroll with the first sequential voucher number for the payroll year", async () => {
        const txSelect = vi
            .fn()
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([]),
                }),
            })
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([]),
                }),
            });
        const insertedVoucherValues: Array<Record<string, unknown>> = [];

        mockSelectWithJoinLimitResolved([
            {
                worker: {
                    id: "worker-1",
                    name: "Alicia",
                    status: "Active",
                },
                employment: {
                    employmentType: "Full Time",
                    employmentArrangement: "Local Worker",
                    minimumWorkingHours: 16,
                    monthlyPay: 2000,
                    hourlyRate: 10,
                    restDayRate: 25,
                    cpf: 0,
                    paymentMethod: "Cash",
                    payNowPhone: null,
                    bankAccountNumber: null,
                },
            },
        ]);
        mocks.findPayrollPeriodConflicts.mockResolvedValueOnce([]);
        mocks.getAdvancesForPayrollPeriod.mockResolvedValueOnce([]);
        mocks.db.transaction.mockImplementationOnce(
            async (callback: (tx: unknown) => Promise<void>) =>
                callback({
                    select: txSelect,
                    insert: createPayrollInsertExecutor(insertedVoucherValues),
                }),
        );

        const result = await createPayrollRecord({
            workerId: "worker-1",
            periodStart: "2026-01-01",
            periodEnd: "2026-01-31",
            payrollDate: "2026-02-05",
        });

        expect(result).toEqual({ success: true });
        expect(insertedVoucherValues[0]).toEqual(
            expect.objectContaining({
                voucherNumber: "2026-0001",
            }),
        );
    });

    it("increments voucher numbers across payroll creations in the same year", async () => {
        const insertedVoucherValues: Array<Record<string, unknown>> = [];
        const txInsert = createPayrollInsertExecutor(insertedVoucherValues);

        mockSelectWithJoinLimitResolved([
            {
                worker: {
                    id: "worker-1",
                    name: "Alicia",
                    status: "Active",
                },
                employment: {
                    employmentType: "Full Time",
                    employmentArrangement: "Local Worker",
                    minimumWorkingHours: 16,
                    monthlyPay: 2000,
                    hourlyRate: 10,
                    restDayRate: 25,
                    cpf: 0,
                    paymentMethod: "Cash",
                    payNowPhone: null,
                    bankAccountNumber: null,
                },
            },
        ]);
        mockSelectWithJoinLimitResolved([
            {
                worker: {
                    id: "worker-2",
                    name: "Bianca",
                    status: "Active",
                },
                employment: {
                    employmentType: "Full Time",
                    employmentArrangement: "Local Worker",
                    minimumWorkingHours: 16,
                    monthlyPay: 2200,
                    hourlyRate: 11,
                    restDayRate: 27,
                    cpf: 0,
                    paymentMethod: "Cash",
                    payNowPhone: null,
                    bankAccountNumber: null,
                },
            },
        ]);
        mocks.findPayrollPeriodConflicts
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([]);
        mocks.getAdvancesForPayrollPeriod
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([]);
        mocks.db.transaction
            .mockImplementationOnce(async (callback: (tx: unknown) => Promise<void>) =>
                callback({
                    select: vi
                        .fn()
                        .mockReturnValueOnce({
                            from: vi.fn().mockReturnValue({
                                where: vi.fn().mockResolvedValue([]),
                            }),
                        })
                        .mockReturnValueOnce({
                            from: vi.fn().mockReturnValue({
                                where: vi.fn().mockResolvedValue([]),
                            }),
                        }),
                    insert: txInsert,
                }))
            .mockImplementationOnce(async (callback: (tx: unknown) => Promise<void>) =>
                callback({
                    select: vi
                        .fn()
                        .mockReturnValueOnce({
                            from: vi.fn().mockReturnValue({
                                where: vi.fn().mockResolvedValue([]),
                            }),
                        })
                        .mockReturnValueOnce({
                            from: vi.fn().mockReturnValue({
                                where: vi.fn().mockResolvedValue([]),
                            }),
                        }),
                    insert: txInsert,
                }));

        await expect(
            createPayrollRecord({
                workerId: "worker-1",
                periodStart: "2026-01-01",
                periodEnd: "2026-01-31",
                payrollDate: "2026-02-05",
            }),
        ).resolves.toEqual({ success: true });
        await expect(
            createPayrollRecord({
                workerId: "worker-2",
                periodStart: "2026-02-01",
                periodEnd: "2026-02-28",
                payrollDate: "2026-03-05",
            }),
        ).resolves.toEqual({ success: true });

        expect(insertedVoucherValues.map((value) => value.voucherNumber)).toEqual([
            "2026-0001",
            "2026-0002",
        ]);
    });

    it("stores voucher numbers as formatted strings on the voucher", async () => {
        const txSelect = vi
            .fn()
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([]),
                }),
            })
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([]),
                }),
            });
        const insertedVoucherValues: Array<Record<string, unknown>> = [];

        mockSelectWithJoinLimitResolved([
            {
                worker: {
                    id: "worker-1",
                    name: "Alicia",
                    status: "Active",
                },
                employment: {
                    employmentType: "Full Time",
                    employmentArrangement: "Local Worker",
                    minimumWorkingHours: 16,
                    monthlyPay: 2000,
                    hourlyRate: 10,
                    restDayRate: 25,
                    cpf: 0,
                    paymentMethod: "Cash",
                    payNowPhone: null,
                    bankAccountNumber: null,
                },
            },
        ]);
        mocks.findPayrollPeriodConflicts.mockResolvedValueOnce([]);
        mocks.getAdvancesForPayrollPeriod.mockResolvedValueOnce([]);
        mocks.db.transaction.mockImplementationOnce(
            async (callback: (tx: unknown) => Promise<void>) =>
                callback({
                    select: txSelect,
                    insert: createPayrollInsertExecutor(insertedVoucherValues),
                }),
        );

        await expect(
            createPayrollRecord({
                workerId: "worker-1",
                periodStart: "2026-01-01",
                periodEnd: "2026-01-31",
                payrollDate: "2026-02-05",
            }),
        ).resolves.toEqual({ success: true });

        expect(typeof insertedVoucherValues[0]?.voucherNumber).toBe("string");
        expect(insertedVoucherValues[0]?.voucherNumber).toMatch(
            /^2026-\d{4}$/,
        );
    });

    it("returns an error when batch payroll creation includes an inactive worker", async () => {
        mockSelectWithJoinLimitResolved([
            {
                worker: {
                    id: "worker-1",
                    name: "Alicia",
                    status: "Inactive",
                },
                employment: {},
            },
        ]);

        const result = await createPayrollRecords({
            workerIds: ["worker-1"],
            periodStart: "2026-03-01",
            periodEnd: "2026-03-31",
            payrollDate: "2026-04-05",
        });

        expect(result).toEqual({
            error: "Cannot create payroll for Alicia because worker status is Inactive",
        });
        expect(mocks.findPayrollPeriodConflicts).not.toHaveBeenCalled();
        expect(mocks.db.transaction).not.toHaveBeenCalled();
    });

    it("returns structured overlap conflict on payroll edit", async () => {
        const conflict = {
            payrollId: "payroll-existing-2",
            workerId: "worker-1",
            workerName: "Alicia",
            periodStart: "2026-03-15",
            periodEnd: "2026-04-10",
            status: "Settled" as const,
        };

        mockSelectWithLimitResolved([
            {
                id: "payroll-editing",
                workerId: "worker-1",
                payrollVoucherId: "voucher-1",
                status: "Draft",
            },
        ]);
        mockSelectWithJoinLimitResolved([
            {
                worker: {
                    id: "worker-1",
                    name: "Alicia",
                    status: "Active",
                },
                employment: {},
            },
        ]);
        mocks.findPayrollPeriodConflicts.mockResolvedValueOnce([conflict]);

        const fd = new FormData();
        fd.set("periodStart", "2026-03-20");
        fd.set("periodEnd", "2026-04-20");
        fd.set("payrollDate", "2026-04-25");

        const result = await updatePayrollRecord({
            payrollId: "payroll-editing",
            periodStart: fd.get("periodStart") as string,
            periodEnd: fd.get("periodEnd") as string,
            payrollDate: fd.get("payrollDate") as string,
        });

        expect(result).toEqual({
            error: "Payroll period overlaps with existing payroll for Alicia (2026-03-15 to 2026-04-10)",
            code: "OVERLAP_CONFLICT",
            conflicts: [conflict],
        });
        expect(mocks.db.transaction).not.toHaveBeenCalled();
    });

    it("recomputes public holidays and totals when editing a draft payroll", async () => {
        mockSelectWithLimitResolved([
            {
                id: "payroll-editing",
                workerId: "worker-1",
                payrollVoucherId: "voucher-1",
                status: "Draft",
            },
        ]);
        mockSelectWithJoinLimitResolved([
            {
                worker: {
                    id: "worker-1",
                    name: "Alicia",
                    status: "Active",
                },
                employment: {
                    employmentType: "Full Time",
                    employmentArrangement: "Local Worker",
                    minimumWorkingHours: 8,
                    monthlyPay: 1000,
                    hourlyRate: 10,
                    restDayRate: 25,
                    cpf: 50,
                    paymentMethod: "Cash",
                    payNowPhone: null,
                    bankAccountNumber: null,
                },
            },
        ]);
        mocks.findPayrollPeriodConflicts.mockResolvedValueOnce([]);
        mocks.db.select
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([
                        {
                            dateIn: "2025-12-31",
                            dateOut: "2025-12-31",
                            hours: "8",
                        },
                        {
                            dateIn: "2026-01-01",
                            dateOut: "2026-01-01",
                            hours: "8",
                        },
                    ]),
                }),
            })
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([
                        { date: "2025-12-31" },
                        { date: "2026-01-01" },
                        { date: "2026-01-02" },
                    ]),
                }),
            });
        mocks.getAdvancesForPayrollPeriod.mockResolvedValueOnce([]);

        const payrollUpdateWhere = vi.fn().mockResolvedValue(undefined);
        const payrollUpdateSet = vi.fn().mockReturnValue({
            where: payrollUpdateWhere,
        });
        const voucherUpdateWhere = vi.fn().mockResolvedValue(undefined);
        const voucherUpdateSet = vi.fn().mockReturnValue({
            where: voucherUpdateWhere,
        });
        const txUpdate = vi
            .fn()
            .mockReturnValueOnce({ set: payrollUpdateSet })
            .mockReturnValueOnce({ set: voucherUpdateSet });
        mocks.db.transaction.mockImplementationOnce(
            async (callback: (tx: unknown) => Promise<void>) =>
                callback({
                    update: txUpdate,
                }),
        );

        const result = await updatePayrollRecord({
            payrollId: "payroll-editing",
            periodStart: "2025-12-31",
            periodEnd: "2026-01-02",
            payrollDate: "2026-01-05",
        });

        expect(result).toEqual({ success: true });
        expect(voucherUpdateSet).toHaveBeenCalledWith(
            expect.objectContaining({
                restDays: 0,
                publicHolidays: 2,
                publicHolidayPay: 50,
                subTotal: 1130,
                grandTotal: 1080,
            }),
        );
    });
});
