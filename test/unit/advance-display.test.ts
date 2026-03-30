import { describe, expect, it } from "vitest";

import {
    advanceDetailPath,
    advanceRequestStatusBadgeClass,
    advanceStatusBadgeClass,
    formatAdvanceAmount,
    formatAdvanceDate,
} from "@/app/dashboard/advance/_presentation/advance-display";

describe("advance-display", () => {
    it("formatAdvanceDate formats ISO date string in en-GB", () => {
        expect(formatAdvanceDate("2025-03-03")).toMatch(/03\/03\/2025/);
    });

    it("formatAdvanceAmount prefixes dollar", () => {
        expect(formatAdvanceAmount(500)).toBe("$500");
    });

    it("advanceDetailPath builds dashboard path", () => {
        expect(advanceDetailPath("abc-123")).toBe("/dashboard/advance/abc-123");
    });

    it("advanceStatusBadgeClass covers loan and paid", () => {
        expect(advanceStatusBadgeClass.loan).toContain("amber");
        expect(advanceStatusBadgeClass.paid).toContain("emerald");
    });

    it("advanceRequestStatusBadgeClass covers loan and paid", () => {
        expect(advanceRequestStatusBadgeClass.loan).toBeDefined();
        expect(advanceRequestStatusBadgeClass.paid).toContain("emerald");
    });
});
