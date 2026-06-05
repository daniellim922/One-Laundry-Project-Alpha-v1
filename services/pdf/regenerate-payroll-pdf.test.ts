import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    buildPayrollPdfData: vi.fn(),
    renderToBuffer: vi.fn(),
    uploadPdf: vi.fn(),
    dbUpdate: vi.fn(),
}));

vi.mock("@/services/pdf/build-payroll-pdf-data", () => ({
    buildPayrollPdfData: (...args: unknown[]) =>
        mocks.buildPayrollPdfData(...args),
}));

vi.mock("@/services/pdf/react-pdf", () => ({
    PayrollPdfDocument: () => null,
}));

vi.mock("@react-pdf/renderer", () => ({
    renderToBuffer: (...args: unknown[]) => mocks.renderToBuffer(...args),
}));

vi.mock("@/lib/supabase/storage", async () => {
    const actual = await vi.importActual<
        typeof import("@/lib/supabase/storage")
    >("@/lib/supabase/storage");
    return {
        ...actual,
        uploadPdf: (...args: unknown[]) => mocks.uploadPdf(...args),
    };
});

vi.mock("@/lib/db", () => ({
    db: {
        update: () => ({
            set: () => ({
                where: (...args: unknown[]) => mocks.dbUpdate(...args),
            }),
        }),
    },
}));

import { regeneratePayrollPdf } from "@/services/pdf/regenerate-payroll-pdf";

const supabase = {} as never;

describe("regeneratePayrollPdf", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.buildPayrollPdfData.mockResolvedValue({
            voucher: { voucher: {}, periodLabel: "", voucherDate: "", workerName: "" },
            timesheet: { entries: [], periodStart: "", periodEnd: "", workerName: "" },
        });
        mocks.renderToBuffer.mockResolvedValue(Buffer.from("pdf"));
        mocks.uploadPdf.mockResolvedValue("payroll/payroll-1/voucher.pdf");
        mocks.dbUpdate.mockResolvedValue(undefined);
    });

    it("builds data, renders, uploads, and persists pdfStoragePath", async () => {
        await regeneratePayrollPdf("payroll-1", supabase);

        expect(mocks.buildPayrollPdfData).toHaveBeenCalledWith("payroll-1");
        expect(mocks.renderToBuffer).toHaveBeenCalled();
        expect(mocks.uploadPdf).toHaveBeenCalledWith(
            supabase,
            "payroll/payroll-1/voucher.pdf",
            expect.any(Buffer),
        );
        expect(mocks.dbUpdate).toHaveBeenCalled();
    });

    it("returns without throwing when payroll data is missing", async () => {
        mocks.buildPayrollPdfData.mockResolvedValue(null);

        await expect(
            regeneratePayrollPdf("missing", supabase),
        ).resolves.toBeUndefined();

        expect(mocks.renderToBuffer).not.toHaveBeenCalled();
    });

    it("swallows render failures without throwing", async () => {
        mocks.renderToBuffer.mockRejectedValue(new Error("render failed"));

        await expect(
            regeneratePayrollPdf("payroll-1", supabase),
        ).resolves.toBeUndefined();
    });
});
