import { describe, expect, it } from "vitest";

import {
    clampIsoDateToRange,
    compareIsoDate,
    dateToLocalIsoYmd,
    formatDmyInput,
    isIsoDateStrict,
    parseDmyToIsoStrict,
    parseIsoToDateStrict,
} from "@/utils/time/calendar-date";

describe("calendar-date", () => {
    it("parses valid DD/MM/YYYY to ISO", () => {
        expect(parseDmyToIsoStrict("06/04/2026")).toBe("2026-04-06");
    });

    it("rejects invalid DD/MM/YYYY date", () => {
        expect(parseDmyToIsoStrict("31/02/2026")).toBeNull();
    });

    it("formats typed digits to DD/MM/YYYY mask", () => {
        expect(formatDmyInput("06042026")).toBe("06/04/2026");
        expect(formatDmyInput("06/0a")).toBe("06/0");
    });

    it("validates strict ISO dates", () => {
        expect(isIsoDateStrict("2026-04-06")).toBe(true);
        expect(isIsoDateStrict("2026-02-31")).toBe(false);
    });

    it("parses strict ISO date and serializes Date back to ISO", () => {
        const parsed = parseIsoToDateStrict("2026-04-06");
        expect(parsed).not.toBeNull();
        expect(dateToLocalIsoYmd(parsed!)).toBe("2026-04-06");
    });

    it("compares ISO dates", () => {
        expect(compareIsoDate("2026-01-01", "2026-01-02")).toBeLessThan(0);
        expect(compareIsoDate("2026-01-02", "2026-01-01")).toBeGreaterThan(0);
        expect(compareIsoDate("2026-01-01", "2026-01-01")).toBe(0);
    });

    it("clamps ISO date to min/max", () => {
        expect(clampIsoDateToRange("2026-01-01", "2026-02-01", undefined)).toBe(
            "2026-02-01",
        );
        expect(clampIsoDateToRange("2026-06-01", undefined, "2026-05-01")).toBe(
            "2026-05-01",
        );
        expect(clampIsoDateToRange("invalid", "2026-01-01", "2026-12-31")).toBe(
            "invalid",
        );
    });
});
