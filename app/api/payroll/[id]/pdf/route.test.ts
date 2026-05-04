import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { mockAuthenticatedApiOperator } from "@/test/_support/api-auth-mock";

const mocks = vi.hoisted(() => ({
    requireCurrentApiUser: vi.fn(),
    eq: vi.fn(),
    db: {
        select: vi.fn(),
    },
    createClient: vi.fn(),
    downloadPdf: vi.fn(),
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

vi.mock("@/lib/supabase/server", () => ({
    createClient: () => mocks.createClient(),
}));

vi.mock("@/lib/supabase/storage", () => ({
    downloadPdf: (...args: unknown[]) => mocks.downloadPdf(...args),
}));

import { GET } from "@/app/api/payroll/[id]/pdf/route";

function mockDbRow(row: object | null) {
    mocks.db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue(row ? [row] : []),
                }),
            }),
        }),
    });
}

describe("GET /api/payroll/[id]/pdf", () => {
    const fakeSupabase = { storage: {} };

    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthenticatedApiOperator(mocks);
        mocks.createClient.mockResolvedValue(fakeSupabase);
        mocks.downloadPdf.mockResolvedValue(new Blob(["payroll-pdf"]));

        mockDbRow({
            workerName: 'Alex /:*?"<>| Tan',
            periodStart: "2026-01-01",
            periodEnd: "2026-01-31",
            pdfStoragePath: "payroll/payroll-1/voucher.pdf",
        });
    });

    it("downloads the PDF from storage and returns an attachment", async () => {
        const response = await GET(
            new NextRequest("http://localhost/api/payroll/payroll-1/pdf"),
            { params: Promise.resolve({ id: "payroll-1" }) },
        );

        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toBe("application/pdf");
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect(response.headers.get("content-disposition")).toBe(
            'attachment; filename="Alex -------- Tan - 01_01_2026-31_01_2026.pdf"',
        );

        expect(mocks.downloadPdf).toHaveBeenCalledWith(
            fakeSupabase,
            "payroll/payroll-1/voucher.pdf",
        );

        const text = await response.text();
        expect(text).toBe("payroll-pdf");
    });

    it("returns 404 PDF_NOT_AVAILABLE when pdfStoragePath is null", async () => {
        mockDbRow({
            workerName: "Alex Tan",
            periodStart: "2026-01-01",
            periodEnd: "2026-01-31",
            pdfStoragePath: null,
        });

        const response = await GET(
            new NextRequest("http://localhost/api/payroll/payroll-1/pdf"),
            { params: Promise.resolve({ id: "payroll-1" }) },
        );

        expect(response.status).toBe(404);
        const body = await response.json();
        expect(body.error.code).toBe("PDF_NOT_AVAILABLE");
        expect(mocks.downloadPdf).not.toHaveBeenCalled();
    });

    it("returns 404 NOT_FOUND when the payroll does not exist", async () => {
        mockDbRow(null);

        const response = await GET(
            new NextRequest("http://localhost/api/payroll/missing/pdf"),
            { params: Promise.resolve({ id: "missing" }) },
        );

        expect(response.status).toBe(404);
        const body = await response.json();
        expect(body.error.code).toBe("NOT_FOUND");
    });

    it("returns 502 STORAGE_ERROR when storage download fails", async () => {
        mocks.downloadPdf.mockRejectedValue(new Error("Storage down"));

        const response = await GET(
            new NextRequest("http://localhost/api/payroll/payroll-1/pdf"),
            { params: Promise.resolve({ id: "payroll-1" }) },
        );

        expect(response.status).toBe(502);
        const body = await response.json();
        expect(body.error.code).toBe("STORAGE_ERROR");
    });
});
