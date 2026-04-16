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

vi.mock("@/app/dashboard/worker/mass-edit/mass-edit-working-hours-button", () => ({
    MassEditWorkingHoursButton: () => "<mass-edit-working-hours-button />",
}));

import { WorkerOverviewLoader } from "@/app/dashboard/worker/worker-overview-loader";

describe("WorkerOverviewLoader", () => {
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
            })
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    innerJoin: vi.fn().mockReturnValue({
                        where: vi.fn().mockReturnValue({
                            orderBy: vi.fn().mockResolvedValue([]),
                        }),
                    }),
                }),
            });

        const html = renderToStaticMarkup(await WorkerOverviewLoader());

        expect(html).toContain("Total workers");
        expect(html).toContain("5");
        expect(html).toContain("3 Active, 2 Inactive");
        expect(html).toContain("View all workers");
        expect(html).toContain("New worker");
        expect(html).toContain("Status breakdown");
    });
});
