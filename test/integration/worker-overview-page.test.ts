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

import WorkerOverviewPage from "@/app/dashboard/worker/page";

describe("WorkerOverviewPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders totals and active/inactive breakdown", async () => {
        mocks.db.select
            .mockReturnValueOnce({
                from: vi.fn().mockResolvedValue([{ total: 5 }]),
            })
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([{ active: 3 }]),
                }),
            });

        const html = renderToStaticMarkup(await WorkerOverviewPage());

        expect(html).toContain("Worker");
        expect(html).toContain("Total workers");
        expect(html).toContain("5");
        expect(html).toContain("3 Active, 2 Inactive");
        expect(html).toContain("View all workers");
        expect(html).toContain("New worker");
        expect(html).toContain("Status breakdown");
    });
});
