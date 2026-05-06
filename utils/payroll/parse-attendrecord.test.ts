import { describe, expect, it } from "vitest";
import { normalizeDateToDmy, parseAttendRecord } from "./parse-attendrecord";

describe("normalizeDateToDmy", () => {
    it("normalizes ISO dates with dashes", () => {
        expect(normalizeDateToDmy("2026-04-01")).toBe("01/04/2026");
    });

    it("normalizes ISO dates with slashes", () => {
        expect(normalizeDateToDmy("2026/04/01")).toBe("01/04/2026");
    });

    it("passes through DD/MM/YYYY", () => {
        expect(normalizeDateToDmy("01/01/2026")).toBe("01/01/2026");
    });

    it("normalizes DD-MM-YYYY", () => {
        expect(normalizeDateToDmy("28-01-2026")).toBe("28/01/2026");
    });

    it("trims whitespace", () => {
        expect(normalizeDateToDmy("  2026-04-01  ")).toBe("01/04/2026");
    });

    it("returns null for invalid input", () => {
        expect(normalizeDateToDmy("not-a-date")).toBeNull();
        expect(normalizeDateToDmy("2026-4-1")).toBeNull();
    });
});

/** Minimal AttendRecord-style grid: one worker, day columns 1–3, two clocked days. */
function minimalRows(attendanceCell: string | null) {
    const attendanceRow =
        attendanceCell == null
            ? []
            : [...Array(25).fill(null), attendanceCell];
    return [
        [],
        [],
        attendanceRow,
        [],
        [
            null,
            "UserID:",
            null,
            "1",
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            "Name:",
            "worker1",
        ],
        [null, 1, 2, 3],
        [
            null,
            "08:00\n18:00",
            "09:00\n17:00",
            null,
        ],
    ];
}

describe("parseAttendRecord", () => {
    it("parses ISO attendance range in header (April-style export)", () => {
        const rows = minimalRows(
            "Attendance date:2026-04-01 ~2026-05-01",
        );
        const out = parseAttendRecord(rows);
        expect(out.attendanceDate).toEqual({
            startDate: "01/04/2026",
            endDate: "01/05/2026",
        });
        expect(out.workers).toHaveLength(1);
        expect(out.workers[0]!.dates.map((d) => d.dateIn)).toEqual([
            "01/04/2026",
            "02/04/2026",
        ]);
    });

    it("parses slash attendance range (legacy export tokens unchanged)", () => {
        const rows = minimalRows(
            "Attendance date:01/01/2026 ~01/28/2026",
        );
        const out = parseAttendRecord(rows);
        expect(out.attendanceDate).toEqual({
            startDate: "01/01/2026",
            endDate: "01/28/2026",
        });
        expect(out.workers[0]!.dates[0]!.dateIn).toBe("01/01/2026");
    });

    it("parses ISO with slash separators in header", () => {
        const rows = minimalRows(
            "Attendance date:2026/04/01 ~2026/05/01",
        );
        const out = parseAttendRecord(rows);
        expect(out.attendanceDate.startDate).toBe("01/04/2026");
        expect(out.attendanceDate.endDate).toBe("01/05/2026");
    });

    it("leaves attendance range empty when header cell is missing", () => {
        const rows = minimalRows(null);
        const out = parseAttendRecord(rows);
        expect(out.attendanceDate).toEqual({ startDate: "", endDate: "" });
    });

    it("leaves attendance range empty when date tokens are not parseable", () => {
        const rows = minimalRows("Attendance date:foo ~bar");
        const out = parseAttendRecord(rows);
        expect(out.attendanceDate).toEqual({ startDate: "", endDate: "" });
    });
});
