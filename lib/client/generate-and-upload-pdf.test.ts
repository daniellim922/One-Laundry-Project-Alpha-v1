import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    fetch: vi.fn(),
    pdfMock: vi.fn(),
    pdfDoc: { toBlob: vi.fn() },
    createClient: vi.fn(),
    uploadPdf: vi.fn(),
}));

vi.mock("@react-pdf/renderer", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@react-pdf/renderer")>();
    return {
        ...actual,
        pdf: (...args: unknown[]) => mocks.pdfMock(...args),
    };
});

vi.mock("@/lib/supabase/client", () => ({
    createClient: () => mocks.createClient(),
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

import {
    generateAndUploadAdvancePdf,
    generateAndUploadPayrollPdf,
} from "@/lib/client/generate-and-upload-pdf";

const payrollPdfData = {
    voucher: {
        voucher: {
            voucherNumber: "2026-0001",
            employmentType: "Full Time",
            monthlyPay: 2200,
            hourlyRate: 9,
            minimumWorkingHours: 260,
            totalHoursWorked: 240,
            hoursNotMet: null,
            hoursNotMetDeduction: null,
            overtimeHours: null,
            overtimePay: null,
            restDays: null,
            restDayRate: null,
            restDayPay: null,
            publicHolidays: null,
            publicHolidayPay: null,
            cpf: 320,
            advance: null,
            subTotal: 1880,
            grandTotal: 1880,
            paymentMethod: "Cash",
            payNowPhone: null,
            bankAccountNumber: null,
        },
        periodLabel: "01/01/2026 – 31/01/2026",
        voucherDate: "05/02/2026",
        workerName: "Alice",
    },
    timesheet: {
        entries: [],
        periodStart: "2026-01-01",
        periodEnd: "2026-01-31",
        workerName: "Alice",
    },
};

const advancePdfData = {
    request: {
        workerName: "Bob",
        amountRequested: 500,
        status: "Advance Loan" as const,
        requestDate: "2026-03-01",
    },
    advances: [],
    employeeSignature: null,
    employeeSignatureDate: null,
    managerSignature: null,
    managerSignatureDate: null,
};

function jsonResponse(body: unknown, init: ResponseInit = {}) {
    return Response.json(body, init);
}

describe("generate-and-upload-pdf client helpers", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", mocks.fetch);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe("generateAndUploadPayrollPdf", () => {
    const fakeSupabase = { storage: { from: vi.fn() } };

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.pdfMock.mockReturnValue(mocks.pdfDoc);
        mocks.pdfDoc.toBlob.mockResolvedValue(new Blob(["fake-pdf"]));
        mocks.createClient.mockReturnValue(fakeSupabase);
        mocks.uploadPdf.mockResolvedValue(undefined);
        mocks.fetch
            .mockResolvedValueOnce(
                jsonResponse({ ok: true, data: payrollPdfData }),
            )
            .mockResolvedValueOnce(new Response(null, { status: 200 }));
    });

    it("fetches pdf data, renders, uploads to payroll path, persists storage path", async () => {
        const result = await generateAndUploadPayrollPdf("payroll-abc");

        expect(result.payrollId).toBe("payroll-abc");
        expect(result.storagePath).toBe("payroll/payroll-abc/voucher.pdf");

        expect(mocks.fetch).toHaveBeenNthCalledWith(
            1,
            "/api/payroll/payroll-abc/pdf-data",
        );
        expect(mocks.fetch).toHaveBeenNthCalledWith(
            2,
            "/api/payroll/payroll-abc/pdf-storage-path",
            expect.objectContaining({
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    storagePath: "payroll/payroll-abc/voucher.pdf",
                }),
            }),
        );

        expect(mocks.pdfMock).toHaveBeenCalledTimes(1);
        expect(mocks.uploadPdf).toHaveBeenCalledWith(
            fakeSupabase,
            "payroll/payroll-abc/voucher.pdf",
            expect.any(Blob),
        );
    });

    it("throws when pdf-data returns an error envelope", async () => {
        mocks.fetch.mockReset();
        mocks.fetch.mockResolvedValueOnce(
            jsonResponse({
                ok: false,
                error: { code: "NOT_FOUND", message: "missing" },
            }),
        );

        await expect(generateAndUploadPayrollPdf("missing")).rejects.toThrow(
            "missing",
        );
        expect(mocks.uploadPdf).not.toHaveBeenCalled();
    });
});

    describe("generateAndUploadAdvancePdf", () => {
    const fakeSupabase = { storage: { from: vi.fn() } };

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.pdfMock.mockReturnValue(mocks.pdfDoc);
        mocks.pdfDoc.toBlob.mockResolvedValue(new Blob(["advance-bytes"]));
        mocks.createClient.mockReturnValue(fakeSupabase);
        mocks.uploadPdf.mockResolvedValue(undefined);
        mocks.fetch
            .mockResolvedValueOnce(
                jsonResponse({ ok: true, data: advancePdfData }),
            )
            .mockResolvedValueOnce(new Response(null, { status: 200 }));
    });

    it("uses advance storage path and PATCH endpoint", async () => {
        const result = await generateAndUploadAdvancePdf("adv-xyz");

        expect(result.advanceRequestId).toBe("adv-xyz");
        expect(result.storagePath).toBe("advance/adv-xyz/voucher.pdf");

        expect(mocks.fetch).toHaveBeenNthCalledWith(
            1,
            "/api/advance/adv-xyz/pdf-data",
        );
        expect(mocks.fetch).toHaveBeenNthCalledWith(
            2,
            "/api/advance/adv-xyz/pdf-storage-path",
            expect.objectContaining({
                method: "PATCH",
                body: JSON.stringify({
                    storagePath: "advance/adv-xyz/voucher.pdf",
                }),
            }),
        );
        expect(mocks.uploadPdf).toHaveBeenCalledWith(
            fakeSupabase,
            "advance/adv-xyz/voucher.pdf",
            expect.any(Blob),
        );
    });
    });
});
