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
        requireCurrentApiUser: vi.fn(),
        eq: vi.fn(),
        db: {
            select: vi.fn(),
        },
        chromiumLaunch: vi.fn(),
        page,
        browser,
    };
});

vi.mock("drizzle-orm", () => ({
    eq: (...args: unknown[]) => mocks.eq(...args),
}));

vi.mock("@/lib/db", () => ({
    db: mocks.db,
}));

vi.mock("@/app/api/_shared/auth", () => ({
    requireCurrentApiUser: (...args: unknown[]) =>
        mocks.requireCurrentApiUser(...args),
}));

vi.mock("playwright", () => ({
    chromium: {
        launch: (...args: unknown[]) => mocks.chromiumLaunch(...args),
    },
}));

import { GET } from "@/app/api/payroll/[id]/pdf/route";

describe("GET /api/payroll/[id]/pdf", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.requireCurrentApiUser.mockResolvedValue({
            email: "operator@example.com",
        });

        mocks.page.pdf.mockResolvedValue(Buffer.from("payroll-pdf"));
        mocks.browser.newPage.mockResolvedValue(mocks.page);
        mocks.chromiumLaunch.mockResolvedValue(mocks.browser);

        mocks.db.select.mockReturnValue({
            from: vi.fn().mockReturnValue({
                innerJoin: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([
                            {
                                workerName: 'Alex /:*?"<>| Tan',
                                periodStart: "2026-01-01",
                                periodEnd: "2026-01-31",
                            },
                        ]),
                    }),
                }),
            }),
        });
    });

    it("renders the voucher PDF and returns an attachment filename", async () => {
        const response = await GET(
            new NextRequest(
                "http://localhost/api/payroll/payroll-1/pdf?mode=voucher",
            ),
            {
                params: Promise.resolve({ id: "payroll-1" }),
            },
        );

        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toBe("application/pdf");
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect(response.headers.get("content-disposition")).toBe(
            'attachment; filename="Alex -------- Tan - 01_01_2026-31_01_2026 (voucher).pdf"',
        );

        expect(mocks.chromiumLaunch).toHaveBeenCalledWith({
            headless: true,
            args: ["--no-sandbox"],
        });
        expect(mocks.browser.newPage).toHaveBeenCalledWith({
            viewport: { width: 1240, height: 1754 },
        });
        expect(mocks.page.setExtraHTTPHeaders).not.toHaveBeenCalled();
        expect(mocks.page.goto).toHaveBeenCalledWith(
            "http://localhost/dashboard/payroll/payroll-1/summary?mode=voucher&print=1",
            { waitUntil: "networkidle" },
        );
        expect(mocks.page.emulateMedia).toHaveBeenCalledWith({
            media: "print",
        });
        expect(mocks.page.evaluate).toHaveBeenCalledTimes(1);
        expect(mocks.page.pdf).toHaveBeenCalledTimes(1);
        expect(mocks.browser.close).toHaveBeenCalledTimes(1);
        await expect(response.arrayBuffer()).resolves.toSatisfy((value) => {
            return Buffer.from(value).toString("utf8") === "payroll-pdf";
        });
    });
});
