import { describe, expect, it } from "vitest";

import {
    flattenForPreview,
    hasRowError,
    isNightShiftParserCellLayout,
    isPreviewDateInvalid,
    isPreviewTimeInInvalid,
    isPreviewTimeOutInvalid,
    previewRowPassesImportValidation,
    previewRowToImportWire,
    resolveAttendRecordDatesForShift,
    type TimesheetImportPreviewRow,
} from "@/services/timesheet/import-preview";
import { dmySlashToIsoWire } from "@/utils/timesheet/import-preview-dates";
import type { TimesheetImportWorker } from "@/app/dashboard/timesheet/import/worker-matching";

const activeDayWorker: TimesheetImportWorker = {
    id: "worker-1",
    name: "Worker One",
    status: "Active",
    shiftPattern: "Day Shift",
};

const activeNightWorker: TimesheetImportWorker = {
    id: "worker-2",
    name: "Night Worker",
    status: "Active",
    shiftPattern: "Night Shift",
};

function row(
    overrides: Partial<TimesheetImportPreviewRow> = {},
): TimesheetImportPreviewRow {
    return {
        workerName: "Worker One",
        dateIn: "01/01/2026",
        dateOut: "01/01/2026",
        timeIn: "09:00",
        timeOut: "17:00",
        ...overrides,
    };
}

describe("services/timesheet/import-preview", () => {
    it("flags invalid dates the same way import wire conversion rejects them", () => {
        expect(isPreviewDateInvalid("not-a-date")).toBe(true);
        expect(dmySlashToIsoWire("not-a-date")).toBe("");
        expect(hasRowError(row({ dateIn: "not-a-date" }))).toBe(true);
    });

    it("accepts valid rows that pass import-style wire + schema validation", () => {
        const valid = row();
        expect(previewRowToImportWire(valid)).toEqual({
            dateIn: "2026-01-01",
            dateOut: "2026-01-01",
            timeIn: "09:00:00",
            timeOut: "17:00:00",
        });
        expect(previewRowPassesImportValidation(valid)).toBe(true);
        expect(hasRowError(valid)).toBe(false);
    });

    it("rejects zero-duration and clock-out-before-clock-in rows", () => {
        expect(
            hasRowError(
                row({
                    timeIn: "17:00",
                    timeOut: "09:00",
                }),
            ),
        ).toBe(true);
        expect(
            hasRowError(
                row({
                    timeIn: "09:00",
                    timeOut: "09:00",
                }),
            ),
        ).toBe(true);
    });

    it("allows blank time-out like import (end-of-day wire time)", () => {
        const withBlankOut = row({ timeOut: "" });
        expect(isPreviewTimeOutInvalid("")).toBe(false);
        expect(previewRowToImportWire(withBlankOut)?.timeOut).toBe("23:59:59");
        expect(hasRowError(withBlankOut)).toBe(false);
    });

    it("requires valid time-in and non-empty invalid time-out", () => {
        expect(isPreviewTimeInInvalid("")).toBe(true);
        expect(isPreviewTimeInInvalid("25:00")).toBe(true);
        expect(isPreviewTimeOutInvalid("25:00")).toBe(true);
    });

    it("detects parser cell layout vs cross-midnight pairs for night shift", () => {
        expect(
            isNightShiftParserCellLayout([
                {
                    dateIn: "01/04/2026",
                    timeIn: "08:00",
                    dateOut: "01/04/2026",
                    timeOut: "20:00",
                },
            ]),
        ).toBe(true);
        expect(
            isNightShiftParserCellLayout([
                {
                    dateIn: "01/04/2026",
                    timeIn: "21:00",
                    dateOut: "02/04/2026",
                    timeOut: "08:00",
                },
            ]),
        ).toBe(false);
    });

    it("re-pairs night shift parser cells in flattenForPreview", () => {
        const flat = flattenForPreview(
            {
                attendanceDate: {
                    startDate: "01/04/2026",
                    endDate: "02/04/2026",
                },
                tablingDate: "02/04/2026 17:10:10",
                workers: [
                    {
                        userId: "",
                        name: "Night Worker",
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
            },
            [activeNightWorker],
            {},
        );
        expect(flat).toHaveLength(1);
        expect(flat[0]).toMatchObject({
            dateIn: "01/04/2026",
            timeIn: "20:00",
            dateOut: "02/04/2026",
            timeOut: "08:00",
        });
    });

    it("does not re-pair when preview rows already have cross-midnight dates", () => {
        const paired = resolveAttendRecordDatesForShift(
            [
                {
                    dateIn: "01/04/2026",
                    timeIn: "21:00",
                    dateOut: "02/04/2026",
                    timeOut: "08:00",
                },
            ],
            "Night Shift",
            "01/04/2026",
        );
        expect(paired[0]).toMatchObject({
            dateIn: "01/04/2026",
            dateOut: "02/04/2026",
        });
    });

    it("matches import rejection cases from import-attend-record-timesheet tests", () => {
        expect(hasRowError(row({ dateIn: "not-a-date" }))).toBe(true);
        expect(
            hasRowError(
                row({
                    dateIn: "31/02/2026",
                    dateOut: "01/01/2026",
                }),
            ),
        ).toBe(true);
    });

    it("flattenForPreview resolves worker by exact name for day shift", () => {
        const flat = flattenForPreview(
            {
                attendanceDate: {
                    startDate: "01/01/2026",
                    endDate: "01/01/2026",
                },
                tablingDate: "01/01/2026",
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
            },
            [activeDayWorker],
            {},
        );
        expect(flat).toHaveLength(1);
        expect(hasRowError(flat[0]!)).toBe(false);
    });
});
