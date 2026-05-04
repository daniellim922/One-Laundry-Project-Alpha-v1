import { describe, expect, it } from "vitest";

import {
    createPayrollPdfBaseName,
    createZipFilename,
    dedupeStringsPreserveOrder,
    formatDownloadErrorsReport,
    makeUniqueZipEntryName,
} from "@/app/api/payroll/download-zip/route";

describe("payroll download zip helpers", () => {
    it("suffixes duplicate names as (2), (3) while keeping first unsuffixed", () => {
        const seen = new Map<string, number>();
        const base = createPayrollPdfBaseName({
            workerName: "Alex",
            periodStart: "01_01_2026",
            periodEnd: "15_01_2026",
        });

        expect(makeUniqueZipEntryName(base, seen)).toBe(
            "Alex - 01_01_2026-15_01_2026.pdf",
        );
        expect(makeUniqueZipEntryName(base, seen)).toBe(
            "Alex - 01_01_2026-15_01_2026 (2).pdf",
        );
        expect(makeUniqueZipEntryName(base, seen)).toBe(
            "Alex - 01_01_2026-15_01_2026 (3).pdf",
        );
    });

    it("does not suffix when same worker has different periods", () => {
        const seen = new Map<string, number>();
        const first = createPayrollPdfBaseName({
            workerName: "Alex",
            periodStart: "01_01_2026",
            periodEnd: "15_01_2026",
        });
        const second = createPayrollPdfBaseName({
            workerName: "Alex",
            periodStart: "16_01_2026",
            periodEnd: "31_01_2026",
        });

        expect(makeUniqueZipEntryName(first, seen)).toBe(
            "Alex - 01_01_2026-15_01_2026.pdf",
        );
        expect(makeUniqueZipEntryName(second, seen)).toBe(
            "Alex - 16_01_2026-31_01_2026.pdf",
        );
    });

    it("deduplicates payroll ids while preserving order", () => {
        const unique = dedupeStringsPreserveOrder([
            "p-1",
            "p-2",
            "p-1",
            "p-3",
            "p-2",
        ]);
        expect(unique).toEqual(["p-1", "p-2", "p-3"]);
    });

    it("creates partial zip filename and includes text report content", () => {
        const zipName = createZipFilename({
            periodStart: "01_01_2026",
            periodEnd: "31_01_2026",
            partial: true,
        });
        expect(zipName).toBe("payrolls-01_01_2026-31_01_2026-partial.zip");

        const report = formatDownloadErrorsReport([
            { payrollId: "p-1", reason: "PDF failed (500)" },
            { payrollId: "p-2", reason: "network timeout" },
        ]);

        expect(report).toContain("Some payroll PDFs failed to download.");
        expect(report).toContain("- p-1: PDF failed (500)");
        expect(report).toContain("- p-2: network timeout");
    });

    it("creates standard zip filename for full success", () => {
        const zipName = createZipFilename({
            periodStart: "01_01_2026",
            periodEnd: "31_01_2026",
            partial: false,
        });
        expect(zipName).toBe("payrolls-01_01_2026-31_01_2026.zip");
    });
});
