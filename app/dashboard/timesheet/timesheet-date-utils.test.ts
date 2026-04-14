import { describe, expect, it } from "vitest";

import {
    dateToIso,
    formatDmyInput,
    isIsoDateStrict,
    isoToDmy,
    parseDmyToIsoStrict,
    parseIsoToDateStrict,
} from "@/app/dashboard/timesheet/timesheet-date-utils";

describe("timesheet-date-utils", () => {
    it("parses valid DD/MM/YYYY to ISO", () => {
        expect(parseDmyToIsoStrict("06/04/2026")).toBe("2026-04-06");
    });

    it("rejects invalid DD/MM/YYYY date", () => {
        expect(parseDmyToIsoStrict("31/02/2026")).toBeNull();
    });

    it("formats ISO to DD/MM/YYYY", () => {
        expect(isoToDmy("2026-04-06")).toBe("06/04/2026");
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
        expect(dateToIso(parsed!)).toBe("2026-04-06");
    });
});
