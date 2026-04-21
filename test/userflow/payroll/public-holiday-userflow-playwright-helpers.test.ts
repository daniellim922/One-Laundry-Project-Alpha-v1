import { describe, expect, it } from "vitest";

import {
    MOM_2026_PUBLIC_HOLIDAYS,
    MOM_PUBLIC_HOLIDAYS_URL,
} from "./public-holiday-userflow-playwright-helpers";

describe("public-holiday-userflow-playwright-helpers", () => {
    it("captures the exact MOM 2026 public-holiday row set", () => {
        expect(MOM_PUBLIC_HOLIDAYS_URL).toBe(
            "https://www.mom.gov.sg/employment-practices/public-holidays",
        );

        expect(MOM_2026_PUBLIC_HOLIDAYS).toEqual([
            { date: "2026-01-01", name: "New Year's Day" },
            { date: "2026-02-17", name: "Chinese New Year" },
            { date: "2026-02-18", name: "Chinese New Year" },
            { date: "2026-03-21", name: "Hari Raya Puasa" },
            { date: "2026-04-03", name: "Good Friday" },
            { date: "2026-05-01", name: "Labour Day" },
            { date: "2026-05-27", name: "Hari Raya Haji" },
            { date: "2026-05-31", name: "Vesak Day" },
            { date: "2026-08-09", name: "National Day" },
            { date: "2026-11-08", name: "Deepavali" },
            { date: "2026-12-25", name: "Christmas Day" },
        ]);
    });
});
