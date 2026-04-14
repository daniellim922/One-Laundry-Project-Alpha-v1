import { describe, expect, it } from "vitest";

import {
    formatEnGbDmyNumericFromCalendar,
    formatEnGbDmyNumericFromIso,
} from "@/utils/time/intl-en-gb";

describe("intl-en-gb", () => {
    it("formatEnGbDmyNumericFromIso formats strict ISO to en-GB numeric", () => {
        expect(formatEnGbDmyNumericFromIso("2026-04-06")).toMatch(/06\/04\/2026/);
    });

    it("formatEnGbDmyNumericFromCalendar formats ISO date string like former localDateDmy", () => {
        expect(formatEnGbDmyNumericFromCalendar("2025-03-03")).toMatch(
            /03\/03\/2025/,
        );
    });
});
