import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { mockAuthenticatedApiOperator } from "@/test/_support/api-auth-mock";

const mocks = vi.hoisted(() => ({
    requireCurrentApiUser: vi.fn(),
    eq: vi.fn(),
    db: {
        select: vi.fn(),
    },
    generatePdf: vi.fn(),
    recordGuidedMonthlyWorkflowStepCompletion: vi.fn(),
}));

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

vi.mock("@/services/payroll/guided-monthly-workflow-activity", () => ({
    recordGuidedMonthlyWorkflowStepCompletion: (...args: unknown[]) =>
        mocks.recordGuidedMonthlyWorkflowStepCompletion(...args),
}));

vi.mock("@/services/pdf/generate-pdf", () => ({
    generatePdf: (...args: unknown[]) => mocks.generatePdf(...args),
}));

import { GET } from "@/app/api/payroll/[id]/pdf/route";

describe("GET /api/payroll/[id]/pdf", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthenticatedApiOperator(mocks);

        mocks.generatePdf.mockResolvedValue(Buffer.from("payroll-pdf"));

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
                {
                    headers: { cookie: "sb-access-token=abc" },
                },
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

        expect(mocks.generatePdf).toHaveBeenCalledWith({
            url: "http://localhost/dashboard/payroll/payroll-1/summary?mode=voucher&print=1",
            cookieHeader: "sb-access-token=abc",
        });
        expect(
            mocks.recordGuidedMonthlyWorkflowStepCompletion,
        ).not.toHaveBeenCalled();
        await expect(response.arrayBuffer()).resolves.toSatisfy((value) => {
            return Buffer.from(value).toString("utf8") === "payroll-pdf";
        });
    });

    it("defaults to summary mode when no mode query param is provided", async () => {
        const response = await GET(
            new NextRequest(
                "http://localhost/api/payroll/payroll-1/pdf",
            ),
            {
                params: Promise.resolve({ id: "payroll-1" }),
            },
        );

        expect(response.status).toBe(200);
        expect(mocks.generatePdf).toHaveBeenCalledWith({
            url: "http://localhost/dashboard/payroll/payroll-1/summary?print=1",
            cookieHeader: undefined,
        });
    });
});
