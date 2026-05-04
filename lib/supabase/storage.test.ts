import { describe, expect, it, vi } from "vitest";

import {
    advanceStoragePath,
    downloadPdf,
    payrollStoragePath,
    uploadPdf,
} from "@/lib/supabase/storage";

describe("Supabase documents storage helpers", () => {
    it("builds deterministic voucher paths", () => {
        expect(payrollStoragePath("pay-uuid")).toBe(
            "payroll/pay-uuid/voucher.pdf",
        );
        expect(advanceStoragePath("adv-uuid")).toBe(
            "advance/adv-uuid/voucher.pdf",
        );
    });

    it("uploadPdf uploads into the documents bucket with PDF metadata", async () => {
        const upload = vi.fn().mockResolvedValue({ error: null });
        const from = vi.fn().mockReturnValue({ upload });
        const client = { storage: { from } } as Parameters<
            typeof uploadPdf
        >[0];

        const path = payrollStoragePath("p1");
        const blob = new Blob(["x"], { type: "application/pdf" });
        await expect(uploadPdf(client, path, blob)).resolves.toBe(path);

        expect(from).toHaveBeenCalledWith("documents");
        expect(upload).toHaveBeenCalledWith(path, blob, {
            contentType: "application/pdf",
            upsert: true,
        });
    });

    it("uploadPdf surfaces Supabase errors", async () => {
        const upload = vi
            .fn()
            .mockResolvedValue({ error: { message: "quota exceeded" } });
        const from = vi.fn().mockReturnValue({ upload });
        const client = { storage: { from } } as Parameters<
            typeof uploadPdf
        >[0];

        await expect(
            uploadPdf(client, payrollStoragePath("p1"), new Blob()),
        ).rejects.toThrow("Storage upload failed: quota exceeded");
    });

    it("downloadPdf returns the blob from storage", async () => {
        const expected = new Blob(["%PDF"]);
        const download = vi
            .fn()
            .mockResolvedValue({ data: expected, error: null });
        const from = vi.fn().mockReturnValue({ download });
        const client = { storage: { from } } as Parameters<
            typeof downloadPdf
        >[0];

        await expect(
            downloadPdf(client, "payroll/p1/voucher.pdf"),
        ).resolves.toBe(expected);
        expect(from).toHaveBeenCalledWith("documents");
        expect(download).toHaveBeenCalledWith("payroll/p1/voucher.pdf");
    });

    it("downloadPdf surfaces Supabase errors", async () => {
        const download = vi.fn().mockResolvedValue({
            data: null,
            error: { message: "not found" },
        });
        const from = vi.fn().mockReturnValue({ download });
        const client = { storage: { from } } as Parameters<
            typeof downloadPdf
        >[0];

        await expect(
            downloadPdf(client, "payroll/missing/voucher.pdf"),
        ).rejects.toThrow("Storage download failed: not found");
    });
});
