import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    db: {
        select: vi.fn(),
        transaction: vi.fn(),
    },
    refreshAffectedDraftPayrollsForPublicHolidayYearInTx: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
    db: mocks.db,
}));

vi.mock("@/services/payroll/refresh-affected-draft-payrolls-for-public-holiday-year", () => ({
    refreshAffectedDraftPayrollsForPublicHolidayYearInTx: (...args: unknown[]) =>
        mocks.refreshAffectedDraftPayrollsForPublicHolidayYearInTx(...args),
}));

import {
    listPublicHolidaysForYear,
    savePublicHolidaysForYear,
} from "@/services/payroll/public-holiday-calendar";

describe("public holiday calendar service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("loads a selected year's holiday rows ordered by date", async () => {
        mocks.db.select.mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    orderBy: vi.fn().mockResolvedValue([
                        {
                            id: "holiday-1",
                            date: "2026-01-01",
                            name: "New Year's Day",
                        },
                        {
                            id: "holiday-2",
                            date: "2026-05-01",
                            name: "Labour Day",
                        },
                    ]),
                }),
            }),
        });

        await expect(listPublicHolidaysForYear({ year: 2026 })).resolves.toEqual([
            {
                id: "holiday-1",
                date: "2026-01-01",
                name: "New Year's Day",
            },
            {
                id: "holiday-2",
                date: "2026-05-01",
                name: "Labour Day",
            },
        ]);
    });

    it("saves a year's holidays as one validated replacement update", async () => {
        const deleteWhere = vi.fn().mockResolvedValue(undefined);
        const deleteFn = vi.fn().mockReturnValue({ where: deleteWhere });
        const insertValues = vi.fn().mockResolvedValue(undefined);
        const insertFn = vi.fn().mockReturnValue({ values: insertValues });
        mocks.refreshAffectedDraftPayrollsForPublicHolidayYearInTx.mockResolvedValueOnce(
            {
                success: true,
                affectedPayrollIds: [],
            },
        );

        mocks.db.transaction.mockImplementationOnce(
            async (callback: (tx: unknown) => Promise<void>) =>
                callback({
                    delete: deleteFn,
                    insert: insertFn,
                }),
        );

        await expect(
            savePublicHolidaysForYear({
                year: 2026,
                holidays: [
                    { date: "2026-01-01", name: "  New Year's Day  " },
                    { date: "2026-05-01", name: "Labour Day" },
                ],
            }),
        ).resolves.toEqual({
            success: true,
            saved: 2,
            affectedPayrollIds: [],
        });

        expect(mocks.db.transaction).toHaveBeenCalledTimes(1);
        expect(deleteFn).toHaveBeenCalledTimes(1);
        expect(insertValues).toHaveBeenCalledWith([
            { date: "2026-01-01", name: "New Year's Day" },
            { date: "2026-05-01", name: "Labour Day" },
        ]);
        expect(
            mocks.refreshAffectedDraftPayrollsForPublicHolidayYearInTx,
        ).toHaveBeenCalledWith(
            expect.objectContaining({
                delete: deleteFn,
                insert: insertFn,
            }),
            { year: 2026 },
        );
    });

    it("returns affected Draft payroll ids after saving and recomputing the shared calendar", async () => {
        const deleteFn = vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
        });
        const insertFn = vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue(undefined),
        });
        mocks.refreshAffectedDraftPayrollsForPublicHolidayYearInTx.mockResolvedValueOnce(
            {
                success: true,
                affectedPayrollIds: ["payroll-draft-1", "payroll-draft-2"],
            },
        );

        mocks.db.transaction.mockImplementationOnce(
            async (callback: (tx: unknown) => Promise<void>) =>
                callback({
                    delete: deleteFn,
                    insert: insertFn,
                }),
        );

        await expect(
            savePublicHolidaysForYear({
                year: 2026,
                holidays: [{ date: "2026-01-01", name: "New Year's Day" }],
            }),
        ).resolves.toEqual({
            success: true,
            saved: 1,
            affectedPayrollIds: ["payroll-draft-1", "payroll-draft-2"],
        });
    });

    it("rejects malformed dates, blank names, and duplicate holiday dates", async () => {
        await expect(
            savePublicHolidaysForYear({
                year: 2026,
                holidays: [
                    { date: "2026-01-01", name: "New Year's Day" },
                    { date: "bad-date", name: "Labour Day" },
                    { date: "2026-01-01", name: "Duplicate date" },
                    { date: "2026-08-09", name: "   " },
                ],
            }),
        ).resolves.toEqual({
            error: "Invalid date",
        });

        expect(mocks.db.transaction).not.toHaveBeenCalled();
    });

    it("rejects holiday dates that do not belong to the selected year", async () => {
        await expect(
            savePublicHolidaysForYear({
                year: 2026,
                holidays: [{ date: "2025-12-31", name: "Cross-year holiday" }],
            }),
        ).resolves.toEqual({
            error: "Holiday date must belong to the selected year",
        });

        expect(mocks.db.transaction).not.toHaveBeenCalled();
    });
});
