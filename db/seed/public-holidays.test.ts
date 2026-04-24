import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    db: {
        insert: vi.fn(),
    },
}));

vi.mock("@/lib/db", () => ({
    db: mocks.db,
}));

import { publicHolidays, seedPublicHolidays } from "./public-holidays";

describe("publicHolidays seed data", () => {
    it("contains exactly 11 holidays for 2025", () => {
        const holidays2025 = publicHolidays.filter((h) =>
            h.date.startsWith("2025-"),
        );
        expect(holidays2025).toHaveLength(11);
    });

    it("contains exactly 11 holidays for 2026", () => {
        const holidays2026 = publicHolidays.filter((h) =>
            h.date.startsWith("2026-"),
        );
        expect(holidays2026).toHaveLength(11);
    });

    it("has no duplicate dates across 2025 and 2026", () => {
        const dates = publicHolidays.map((h) => h.date);
        expect(new Set(dates).size).toBe(dates.length);
    });

    it("has dates that fall on expected calendar days", () => {
        const expectedDays: Record<string, number> = {
            "2025-01-01": 3, // Wednesday
            "2025-01-29": 3, // Wednesday
            "2025-01-30": 4, // Thursday
            "2025-03-31": 1, // Monday
            "2025-04-18": 5, // Friday
            "2025-05-01": 4, // Thursday
            "2025-05-12": 1, // Monday
            "2025-06-07": 6, // Saturday
            "2025-08-09": 6, // Saturday
            "2025-10-20": 1, // Monday
            "2025-12-25": 4, // Thursday
            "2026-01-01": 4, // Thursday
            "2026-02-17": 2, // Tuesday
            "2026-02-18": 3, // Wednesday
            "2026-03-21": 6, // Saturday
            "2026-04-03": 5, // Friday
            "2026-05-01": 5, // Friday
            "2026-05-27": 3, // Wednesday
            "2026-05-31": 0, // Sunday
            "2026-08-09": 0, // Sunday
            "2026-11-08": 0, // Sunday
            "2026-12-25": 5, // Friday
        };

        for (const holiday of publicHolidays) {
            const dayOfWeek = new Date(holiday.date).getUTCDay();
            expect(dayOfWeek).toBe(expectedDays[holiday.date]);
        }
    });
});

describe("seedPublicHolidays", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.db.insert.mockReturnValue({ values: vi.fn() });
    });

    it("inserts all public holidays into the database", async () => {
        await seedPublicHolidays();

        expect(mocks.db.insert).toHaveBeenCalledTimes(1);
        const callArgs = mocks.db.insert.mock.results[0]?.value?.values?.mock
            ?.calls?.[0]?.[0];
        expect(callArgs).toHaveLength(publicHolidays.length);
    });
});
