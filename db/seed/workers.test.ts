import { describe, expect, it } from "vitest";

import { workers } from "@/db/seed/workers";

describe("worker seed data", () => {
    it("seeds Ding Chun Rong as full-time with zero variable rates", () => {
        const ding = workers.find((worker) => worker.name === "Ding Chun Rong");

        expect(ding).toEqual(
            expect.objectContaining({
                employmentType: "Full Time",
                monthlyPay: expect.any(Number),
                hourlyRate: 0,
                restDayRate: 0,
            }),
        );
        expect(ding?.monthlyPay).toBeGreaterThan(0);
    });
});
