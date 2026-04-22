import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
    db: {
        select: vi.fn(),
    },
}));

vi.mock("@/lib/db", () => ({
    db: mocks.db,
}));

import { WorkerOverviewLoader } from "@/app/dashboard/worker/worker-overview-loader";

function mockSelectSequence(
    results: [
        groupBy: unknown,
        activeCount: unknown,
        fullTimeRows: unknown,
        hoursAgg: unknown,
    ],
) {
    const [r0, r1, r2, r3] = results;
    mocks.db.select
        .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                innerJoin: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        groupBy: vi.fn().mockResolvedValue(r0),
                    }),
                }),
            }),
        })
        .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(r1),
            }),
        })
        .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                innerJoin: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        orderBy: vi.fn().mockResolvedValue(r2),
                    }),
                }),
            }),
        })
        .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                innerJoin: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue(r3),
                }),
            }),
        });
}

describe("WorkerOverviewLoader", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders active worker count and key overview sections", async () => {
        mockSelectSequence([[], [{ count: 3 }], [], [{ minHours: null, maxHours: null }]]);

        const html = renderToStaticMarkup(await WorkerOverviewLoader());

        expect(html).toContain("Active workers");
        expect(html).toContain("3");
        expect(html).toContain("View all workers");
        expect(html).toContain("New worker");
        expect(html).toContain("Full Time monthly pay");
        expect(html).toContain("Local Full Time employee CPF");
        expect(html).toContain("Workforce composition");
    });
});
