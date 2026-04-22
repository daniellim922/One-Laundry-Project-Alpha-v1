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
    results: [groupBy: unknown, fullTimeRows: unknown, hoursAgg: unknown],
) {
    const [r0, r1, r2] = results;
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
                innerJoin: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        orderBy: vi.fn().mockResolvedValue(r1),
                    }),
                }),
            }),
        })
        .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                innerJoin: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        groupBy: vi.fn().mockReturnValue({
                            orderBy: vi.fn().mockResolvedValue(r2),
                        }),
                    }),
                }),
            }),
        });
}

describe("WorkerOverviewLoader", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders key overview sections", async () => {
        mockSelectSequence([[], [], []]);

        const html = renderToStaticMarkup(await WorkerOverviewLoader());

        expect(html).toContain("Minimum working hours");
        expect(html).toContain("View all workers");
        expect(html).toContain("New worker");
        expect(html).toContain("Full Time Foreign Worker");
        expect(html).toContain("Full Time Local CPF");
        expect(html).toContain("Workforce composition");
    });
});
