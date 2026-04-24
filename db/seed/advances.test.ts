import { describe, expect, it } from "vitest";
import {
    advances,
    advanceSeedPeriods,
    quarterlyAdvanceCohortWorkerIndexes,
} from "./advances";

describe("advance seed periods", () => {
    it("uses the settled historical payroll window for advance requests", () => {
        expect(advanceSeedPeriods.map((period) => period.key)).toEqual([
            "2025-04",
            "2025-05",
            "2025-06",
            "2025-07",
            "2025-08",
            "2025-09",
            "2025-10",
            "2025-11",
            "2025-12",
        ]);
    });
});

describe("seeded advances", () => {
    it("keeps advance requests within the settled historical payroll window", () => {
        const allowedRequestMonths = new Set(
            advanceSeedPeriods
                .filter((_, periodIndex) => periodIndex % 3 === 0)
                .map((period) => period.key),
        );

        expect(advances).toHaveLength(
            quarterlyAdvanceCohortWorkerIndexes.length * allowedRequestMonths.size,
        );

        for (const advance of advances) {
            expect(allowedRequestMonths.has(advance.dateRequested.slice(0, 7))).toBe(
                true,
            );
        }
    });

    it("keeps installment repayment dates within the settled historical payroll window", () => {
        const allowedRepaymentMonths = new Set(
            advanceSeedPeriods.map((period) => period.key),
        );

        for (const advance of advances) {
            for (const term of advance.repaymentTerms) {
                expect(allowedRepaymentMonths.has(term.installmentDate.slice(0, 7))).toBe(
                    true,
                );
            }
        }
    });

    it("produces no advance requests or installments in January through March 2026", () => {
        for (const advance of advances) {
            expect(advance.dateRequested >= "2026-01-01").toBe(false);
        }

        expect(
            advances.some(
                (advance) =>
                    (advance.dateRequested >= "2026-01-01" &&
                        advance.dateRequested <= "2026-03-31") ||
                    advance.repaymentTerms.some(
                        (term) =>
                            term.installmentDate >= "2026-01-01" &&
                            term.installmentDate <= "2026-03-31",
                    ),
            ),
        ).toBe(false);
    });
});
