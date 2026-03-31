import { describe, expect, it } from "vitest";

import { formatAdvanceDate } from "@/app/dashboard/advance/_presentation/advance-display";

describe("advance-display", () => {
    it("formatAdvanceDate formats ISO date string in en-GB", () => {
        expect(formatAdvanceDate("2025-03-03")).toMatch(/03\/03\/2025/);
    });
});
