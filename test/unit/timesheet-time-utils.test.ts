import { describe, expect, it } from "vitest";

import {
    isHmTimeStrict,
    normalizeHmTime,
} from "@/app/dashboard/timesheet/timesheet-time-utils";

describe("timesheet-time-utils", () => {
    it("accepts strict HH:MM format", () => {
        expect(isHmTimeStrict("00:00")).toBe(true);
        expect(isHmTimeStrict("23:59")).toBe(true);
    });

    it("rejects invalid HH:MM values", () => {
        expect(isHmTimeStrict("24:00")).toBe(false);
        expect(isHmTimeStrict("9:00")).toBe(false);
        expect(isHmTimeStrict("12:60")).toBe(false);
    });

    it("normalizes H:MM and HH:MM:SS into HH:MM", () => {
        expect(normalizeHmTime("9:05")).toBe("09:05");
        expect(normalizeHmTime("10:30:00")).toBe("10:30");
    });

    it("returns empty string for non-time values", () => {
        expect(normalizeHmTime("")).toBe("");
        expect(normalizeHmTime("ab:cd")).toBe("");
    });
});
