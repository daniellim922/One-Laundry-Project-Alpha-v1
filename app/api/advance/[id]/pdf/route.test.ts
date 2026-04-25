import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
    return {
        requireCurrentApiUser: vi.fn(),
        eq: vi.fn(),
        db: {
            select: vi.fn(),
        },
        generatePdf: vi.fn(),
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

vi.mock("@/services/pdf/generate-pdf", () => ({
    generatePdf: (...args: unknown[]) => mocks.generatePdf(...args),
}));

import { GET } from "@/app/api/advance/[id]/pdf/route";

describe("GET /api/advance/[id]/pdf", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.requireCurrentApiUser.mockResolvedValue({
            email: "operator@example.com",
        });

        mocks.generatePdf.mockResolvedValue(Buffer.from("advance-pdf"));

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
            new NextRequest("http://localhost/api/advance/adv-1/pdf", {
                headers: { cookie: "sb-access-token=abc" },
            }),
            {
                params: Promise.resolve({ id: "adv-1" }),
            },
        );

        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toBe("application/pdf");
        expect(response.headers.get("content-disposition")).toBe(
            'attachment; filename="Jamie - Tan - Advance - $700 - 20_04_2026.pdf"',
        );
        expect(mocks.generatePdf).toHaveBeenCalledWith({
            url: "http://localhost/dashboard/advance/adv-1/summary?print=1",
            cookieHeader: "sb-access-token=abc",
        });
        await expect(response.arrayBuffer()).resolves.toSatisfy((value) => {
            return Buffer.from(value).toString("utf8") === "advance-pdf";
        });
    });
});
