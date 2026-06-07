import { beforeEach, describe, expect, it, vi } from "vitest";

const { drizzleAscSpy, drizzleDescSpy, drizzleEqSpy } = vi.hoisted(() => ({
    drizzleAscSpy: vi.fn(),
    drizzleDescSpy: vi.fn(),
    drizzleEqSpy: vi.fn(),
}));

const mocks = vi.hoisted(() => ({
    db: {
        select: vi.fn(),
    },
}));

vi.mock("drizzle-orm", async (importOriginal) => {
    const actual = await importOriginal<typeof import("drizzle-orm")>();
    return {
        ...actual,
        asc: (column: unknown) => {
            drizzleAscSpy(column);
            return actual.asc(column as never);
        },
        desc: (column: unknown) => {
            drizzleDescSpy(column);
            return actual.desc(column as never);
        },
        eq: (column: unknown, value: unknown) => {
            drizzleEqSpy(column, value);
            return actual.eq(column as never, value as never);
        },
    };
});

vi.mock("@/lib/db", () => ({
    db: mocks.db,
}));

import { employmentTable } from "@/db/tables/employmentTable";
import { payrollTable } from "@/db/tables/payrollTable";
import { workerTable } from "@/db/tables/workerTable";
import { listDraftPayrollsForSettlement } from "@/services/payroll/list-draft-payrolls-for-settlement";
import { listPayrollsForDownload } from "@/services/payroll/list-payrolls-for-download";
import { queryPayrollRowsWithWorkerForList } from "@/services/payroll/_shared/query-payroll-selection-rows";

describe("queryPayrollRowsWithWorkerForList", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    function configureJoinChain(options: {
        mockAfterJoins: {
            where: ReturnType<typeof vi.fn>;
            orderBy: ReturnType<typeof vi.fn>;
        };
    }) {
        mocks.db.select.mockReturnValue({
            from: vi.fn().mockReturnValue({
                innerJoin: vi.fn().mockReturnValue({
                    innerJoin: vi.fn().mockReturnValue({
                        innerJoin: vi.fn().mockReturnValue(options.mockAfterJoins),
                    }),
                }),
            }),
        });
    }

    it("applies status filter before orderBy when statusFilter is provided", async () => {
        const orderBy = vi.fn().mockResolvedValue([]);
        const whereOnQuery = vi.fn().mockReturnValue({ orderBy });

        configureJoinChain({
            mockAfterJoins: {
                where: whereOnQuery,
                orderBy,
            },
        });

        await queryPayrollRowsWithWorkerForList("Draft");

        expect(whereOnQuery).toHaveBeenCalledTimes(1);
        expect(drizzleEqSpy).toHaveBeenCalledWith(payrollTable.status, "Draft");
        expect(orderBy).toHaveBeenCalledTimes(1);
        expect(whereOnQuery.mock.invocationCallOrder[0]).toBeLessThan(
            orderBy.mock.invocationCallOrder[0]!,
        );
    });

    it("calls orderBy directly when no statusFilter", async () => {
        const orderBy = vi.fn().mockResolvedValue([]);
        const whereOnQuery = vi.fn().mockReturnValue({ orderBy });

        configureJoinChain({
            mockAfterJoins: {
                where: whereOnQuery,
                orderBy,
            },
        });

        await queryPayrollRowsWithWorkerForList();

        expect(whereOnQuery).not.toHaveBeenCalled();
        expect(orderBy).toHaveBeenCalledTimes(1);
        expect(drizzleAscSpy).toHaveBeenCalledWith(payrollTable.status);
        expect(drizzleDescSpy).toHaveBeenCalledWith(payrollTable.payrollDate);
        expect(drizzleAscSpy).toHaveBeenCalledWith(
            employmentTable.employmentArrangement,
        );
        expect(drizzleAscSpy).toHaveBeenCalledWith(employmentTable.employmentType);
        expect(drizzleAscSpy).toHaveBeenCalledWith(workerTable.name);
    });

    it("flattens payroll join row into PayrollSelectionRow", async () => {
        const payroll = {
            id: "pay-1",
            workerId: "w-1",
            payrollVoucherId: "v-1",
            periodStart: "2026-01-01",
            periodEnd: "2026-01-31",
            payrollDate: "2026-02-05",
            status: "Draft",
        };
        const orderBy = vi.fn().mockResolvedValue([
            {
                payroll,
                workerName: "Ada",
                employmentType: "Full Time",
                shiftPattern: "Day Shift",
                employmentArrangement: "Local Worker",
                voucherNumber: "2026-0001",
            },
        ]);
        const whereOnQuery = vi.fn().mockReturnValue({ orderBy });

        configureJoinChain({
            mockAfterJoins: {
                where: whereOnQuery,
                orderBy,
            },
        });

        await expect(queryPayrollRowsWithWorkerForList()).resolves.toEqual([
            {
                ...payroll,
                workerName: "Ada",
                employmentType: "Full Time",
                shiftPattern: "Day Shift",
                employmentArrangement: "Local Worker",
                voucherNumber: "2026-0001",
            },
        ]);
    });

    it("listDraftPayrollsForSettlement uses Draft status filter", async () => {
        const orderBy = vi.fn().mockResolvedValue([]);
        const whereOnQuery = vi.fn().mockReturnValue({ orderBy });

        configureJoinChain({
            mockAfterJoins: {
                where: whereOnQuery,
                orderBy,
            },
        });

        await listDraftPayrollsForSettlement();

        expect(whereOnQuery).toHaveBeenCalledTimes(1);
        expect(orderBy).toHaveBeenCalledTimes(1);
    });

    it("listPayrollsForDownload does not apply status filter", async () => {
        const orderBy = vi.fn().mockResolvedValue([]);
        const whereOnQuery = vi.fn().mockReturnValue({ orderBy });

        configureJoinChain({
            mockAfterJoins: {
                where: whereOnQuery,
                orderBy,
            },
        });

        await listPayrollsForDownload();

        expect(whereOnQuery).not.toHaveBeenCalled();
        expect(orderBy).toHaveBeenCalledTimes(1);
    });
});
