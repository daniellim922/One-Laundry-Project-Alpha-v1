import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
    const page = {
        setExtraHTTPHeaders: vi.fn(),
        goto: vi.fn(),
        emulateMedia: vi.fn(),
        evaluate: vi.fn(),
        pdf: vi.fn(),
    };

    const browser = {
        newPage: vi.fn(),
        close: vi.fn(),
    };

    return {
        requireApiPermission: vi.fn(),
        eq: vi.fn(),
        db: {
            select: vi.fn(),
        },
        chromiumLaunch: vi.fn(),
        page,
        browser,
    };
});

vi.mock("@/app/api/_shared/auth", () => ({
    requireApiPermission: (...args: unknown[]) =>
        mocks.requireApiPermission(...args),
}));

vi.mock("drizzle-orm", () => ({
    eq: (...args: unknown[]) => mocks.eq(...args),
}));

vi.mock("@/lib/db", () => ({
    db: mocks.db,
}));

vi.mock("playwright", () => ({
    chromium: {
        launch: (...args: unknown[]) => mocks.chromiumLaunch(...args),
    },
}));

import { GET } from "@/app/api/advance/[id]/pdf/route";

describe("GET /api/advance/[id]/pdf", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mocks.requireApiPermission.mockResolvedValue({
            session: null,
            userId: "open-access",
        });

        mocks.page.pdf.mockResolvedValue(Buffer.from("advance-pdf"));
        mocks.browser.newPage.mockResolvedValue(mocks.page);
        mocks.chromiumLaunch.mockResolvedValue(mocks.browser);

        mocks.db.select.mockReturnValue({
            from: vi.fn().mockReturnValue({
                innerJoin: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([
                            {
                                workerName: "Jamie / Tan",
                                amountRequested: 700,
                                requestDate: "2026-04-20",
                            },
                        ]),
                    }),
                }),
            }),
        });
    });

    it("renders the advance summary PDF and returns an attachment filename", async () => {
        const response = await GET(
            new NextRequest("http://localhost/api/advance/adv-1/pdf"),
            {
                params: Promise.resolve({ id: "adv-1" }),
            },
        );

        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toBe("application/pdf");
        expect(response.headers.get("content-disposition")).toBe(
            'attachment; filename="Jamie - Tan - Advance - $700 - 20_04_2026.pdf"',
        );
        expect(mocks.page.setExtraHTTPHeaders).not.toHaveBeenCalled();
        expect(mocks.page.goto).toHaveBeenCalledWith(
            "http://localhost/dashboard/advance/adv-1/summary?print=1",
            { waitUntil: "networkidle" },
        );
        expect(mocks.browser.close).toHaveBeenCalledTimes(1);
    });
});
