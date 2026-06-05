import { describe, expect, it } from "vitest";

import { computeAdhocTotal } from "@/services/payroll/adhoc-line-items";

describe("computeAdhocTotal", () => {
    it("returns zero for empty or missing adhoc arrays", () => {
        expect(computeAdhocTotal([])).toBe(0);
        expect(computeAdhocTotal(null)).toBe(0);
        expect(computeAdhocTotal(undefined)).toBe(0);
    });

    it("sums positive and negative line amounts with money rounding", () => {
        expect(
            computeAdhocTotal([
                { name: "Bonus", amount: 50.555 },
                { name: "Adjustment", amount: -10.004 },
            ]),
        ).toBe(40.55);
    });
});
