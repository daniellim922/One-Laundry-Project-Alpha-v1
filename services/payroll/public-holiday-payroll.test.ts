import { describe, expect, it, vi } from "vitest";

import { countPayrollPublicHolidays } from "@/services/payroll/public-holiday-payroll";

describe("payroll public holiday service", () => {
    it("counts only holiday dates in range that match worked clock-in dates across year boundaries", async () => {
        const executor = {
            select: vi.fn().mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([
                        { date: "2025-12-31" },
                        { date: "2026-01-01" },
                        { date: "2026-01-02" },
                    ]),
                }),
            }),
        };

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
});
