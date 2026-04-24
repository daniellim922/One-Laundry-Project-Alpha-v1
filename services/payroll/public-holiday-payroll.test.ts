import { describe, expect, it, vi } from "vitest";

import {
    countPayrollPublicHolidays,
    listPayrollPublicHolidays,
} from "@/services/payroll/public-holiday-payroll";

function mockExecutorRows(
    rows: { date: string; name: string }[],
): Pick<typeof import("@/lib/db").db, "select"> {
    return {
        select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(rows),
            }),
        }),
    };
}

describe("payroll public holiday service", () => {
    const rangeRows = [
        { date: "2025-12-31", name: "New Year's Eve" },
        { date: "2026-01-01", name: "New Year's Day" },
        { date: "2026-01-02", name: "Day 2" },
    ];

    it("counts only holiday dates in range that match worked clock-in dates across year boundaries", async () => {
        const executor = mockExecutorRows(rangeRows);

        await expect(
            countPayrollPublicHolidays(
                {
                    periodStart: "2025-12-31",
                    periodEnd: "2026-01-02",
                    workedDateIns: [
                        "2025-12-31",
                        "2026-01-01",
                        "2026-01-01",
                        "2026-01-03",
                    ],
                },
                executor,
            ),
        ).resolves.toBe(2);
    });

    it("lists matching holidays in date order with names", async () => {
        const executor = mockExecutorRows(rangeRows);

        await expect(
            listPayrollPublicHolidays(
                {
                    periodStart: "2025-12-31",
                    periodEnd: "2026-01-02",
                    workedDateIns: [
                        "2026-01-01",
                        "2025-12-31",
                        "2026-01-03",
                    ],
                },
                executor,
            ),
        ).resolves.toEqual([
            { date: "2025-12-31", name: "New Year's Eve" },
            { date: "2026-01-01", name: "New Year's Day" },
        ]);
    });
});
