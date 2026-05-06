import { describe, expect, it } from "vitest";

import type { AttendRecordDate } from "@/utils/payroll/parse-attendrecord";

import { transformNightShiftEntries } from "./transform-night-shift-entries";

const PLACEHOLDER = "     ";

function raw(
    date: string,
    row1: string,
    row2: string | typeof PLACEHOLDER,
): AttendRecordDate {
    return {
        dateIn: date,
        timeIn: row1,
        dateOut: date,
        timeOut: row2,
    };
}

describe("transformNightShiftEntries", () => {
    it("pairs middle nights: row2 clock-in pairs with next column row1 clock-out", () => {
        const out = transformNightShiftEntries(
            [
                raw("01/04/2026", "08:00", "20:00"),
                raw("02/04/2026", "08:00", "20:00"),
                raw("03/04/2026", "08:00", PLACEHOLDER),
            ],
            "",
        );
        expect(out).toEqual([
            {
                dateIn: "01/04/2026",
                timeIn: "20:00",
                dateOut: "02/04/2026",
                timeOut: "08:00",
            },
            {
                dateIn: "02/04/2026",
                timeIn: "20:00",
                dateOut: "03/04/2026",
                timeOut: "08:00",
            },
        ]);
    });

    it("first day: only evening clock-in (single line in cell) pairs with next day row1", () => {
        const out = transformNightShiftEntries(
            [
                raw("01/04/2026", "21:00", PLACEHOLDER),
                raw("02/04/2026", "08:00", PLACEHOLDER),
            ],
            "",
        );
        expect(out).toEqual([
            {
                dateIn: "01/04/2026",
                timeIn: "21:00",
                dateOut: "02/04/2026",
                timeOut: "08:00",
            },
        ]);
    });

    it("last day: only morning clock-out (row1) finishes the prior night without starting a new shift", () => {
        const out = transformNightShiftEntries(
            [
                raw("01/04/2026", "21:00", PLACEHOLDER),
                raw("02/04/2026", "08:00", "20:00"),
                raw("03/04/2026", "08:00", PLACEHOLDER),
            ],
            "",
        );
        expect(out).toEqual([
            {
                dateIn: "01/04/2026",
                timeIn: "21:00",
                dateOut: "02/04/2026",
                timeOut: "08:00",
            },
            {
                dateIn: "02/04/2026",
                timeIn: "20:00",
                dateOut: "03/04/2026",
                timeOut: "08:00",
            },
        ]);
    });

    it("when the second day also clocks an evening in, the open shift at period end is incomplete", () => {
        const out = transformNightShiftEntries(
            [
                raw("01/04/2026", "21:00", PLACEHOLDER),
                raw("02/04/2026", "08:00", "20:00"),
            ],
            "",
        );
        expect(out).toEqual([
            {
                dateIn: "01/04/2026",
                timeIn: "21:00",
                dateOut: "02/04/2026",
                timeOut: "08:00",
            },
            {
                dateIn: "02/04/2026",
                timeIn: "20:00",
                dateOut: "03/04/2026",
                timeOut: PLACEHOLDER,
            },
        ]);
    });

    it("last day: evening row2 with no following column yields incomplete shift (placeholder time-out)", () => {
        const out = transformNightShiftEntries(
            [
                raw("01/04/2026", "08:00", "20:00"),
                raw("02/04/2026", "08:00", "20:00"),
            ],
            "",
        );
        expect(out).toEqual([
            {
                dateIn: "01/04/2026",
                timeIn: "20:00",
                dateOut: "02/04/2026",
                timeOut: "08:00",
            },
            {
                dateIn: "02/04/2026",
                timeIn: "20:00",
                dateOut: "03/04/2026",
                timeOut: PLACEHOLDER,
            },
        ]);
    });

    it("single-day period: one evening-only cell becomes one incomplete cross-midnight row", () => {
        const out = transformNightShiftEntries(
            [raw("15/04/2026", "21:00", PLACEHOLDER)],
            "",
        );
        expect(out).toEqual([
            {
                dateIn: "15/04/2026",
                timeIn: "21:00",
                dateOut: "16/04/2026",
                timeOut: PLACEHOLDER,
            },
        ]);
    });

    it("single-day period: two-line cell uses row2 as evening in and is incomplete", () => {
        const out = transformNightShiftEntries(
            [raw("15/04/2026", "08:00", "20:00")],
            "",
        );
        expect(out).toEqual([
            {
                dateIn: "15/04/2026",
                timeIn: "20:00",
                dateOut: "16/04/2026",
                timeOut: PLACEHOLDER,
            },
        ]);
    });

    it("sorts out-of-order raw dates before pairing", () => {
        const out = transformNightShiftEntries(
            [
                raw("03/04/2026", "08:00", PLACEHOLDER),
                raw("01/04/2026", "21:00", PLACEHOLDER),
                raw("02/04/2026", "08:00", PLACEHOLDER),
            ],
            "",
        );
        expect(out).toEqual([
            {
                dateIn: "01/04/2026",
                timeIn: "21:00",
                dateOut: "02/04/2026",
                timeOut: "08:00",
            },
        ]);
    });

    it("drops entries before periodStartDate when provided (ISO)", () => {
        const out = transformNightShiftEntries(
            [
                raw("01/04/2026", "21:00", PLACEHOLDER),
                raw("02/04/2026", "08:00", "20:00"),
            ],
            "2026-04-02",
        );
        expect(out).toEqual([
            {
                dateIn: "02/04/2026",
                timeIn: "20:00",
                dateOut: "03/04/2026",
                timeOut: PLACEHOLDER,
            },
        ]);
    });

    it("drops entries before periodStartDate when provided (DMY)", () => {
        const out = transformNightShiftEntries(
            [
                raw("01/04/2026", "21:00", PLACEHOLDER),
                raw("02/04/2026", "08:00", "20:00"),
            ],
            "02/04/2026",
        );
        expect(out).toEqual([
            {
                dateIn: "02/04/2026",
                timeIn: "20:00",
                dateOut: "03/04/2026",
                timeOut: PLACEHOLDER,
            },
        ]);
    });
});
