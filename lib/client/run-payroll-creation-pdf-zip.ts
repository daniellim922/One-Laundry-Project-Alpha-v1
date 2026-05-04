"use client";

import JSZip from "jszip";

import { generateAndUploadPayrollPdf } from "@/lib/client/generate-and-upload-pdf";
import { isoToDdmmyyyy, safeFilenamePart } from "@/lib/pdf-filename-parts";

export type PayrollCreationPdfZipProgress = {
    i: number;
    n: number;
    currentName?: string;
};

function appendNumericSuffix(filename: string, n: number): string {
    const lastDot = filename.lastIndexOf(".");
    if (lastDot <= 0) return `${filename} (${n})`;
    const stem = filename.slice(0, lastDot);
    const ext = filename.slice(lastDot);
    return `${stem} (${n})${ext}`;
}

function makeUniqueZipEntryName(
    baseName: string,
    seenNames: Map<string, number>,
): string {
    const count = seenNames.get(baseName) ?? 0;
    seenNames.set(baseName, count + 1);
    if (count === 0) return baseName;
    return appendNumericSuffix(baseName, count + 1);
}

export function buildPayrollPdfZipEntryName(args: {
    workerName: string;
    periodStart: string;
    periodEnd: string;
}): string {
    return safeFilenamePart(
        `${args.workerName} - ${args.periodStart}-${args.periodEnd}.pdf`,
    );
}

export function buildPayrollCreationZipFilename(args: {
    periodStart: string;
    periodEnd: string;
    partial: boolean;
}): string {
    const partialSuffix = args.partial ? "-partial" : "";
    return safeFilenamePart(
        `payrolls-${isoToDdmmyyyy(args.periodStart)}-${isoToDdmmyyyy(args.periodEnd)}${partialSuffix}.zip`,
    );
}

function formatPayrollPdfFailuresReport(
    failures: { payrollId: string; reason: string }[],
): string {
    return [
        "Some payroll PDFs failed to generate.",
        "",
        ...failures.map((f) => `- ${f.payrollId}: ${f.reason}`),
        "",
    ].join("\n");
}

export function triggerBrowserDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

/**
 * After batch payroll creation: generate each voucher PDF (upload to storage),
 * bundle successful blobs into a ZIP, and trigger a browser download.
 */
export async function runPayrollCreationPdfZip(args: {
    createdPayrolls: { payrollId: string; workerId: string }[];
    resolveWorkerName: (workerId: string) => string;
    periodStart: string;
    periodEnd: string;
    onProgress: (state: PayrollCreationPdfZipProgress) => void;
}): Promise<{ ok: true } | { ok: false; error: string }> {
    const {
        createdPayrolls,
        resolveWorkerName,
        periodStart,
        periodEnd,
        onProgress,
    } = args;

    const n = createdPayrolls.length;
    if (n === 0) {
        return { ok: true };
    }

    const failures: { payrollId: string; reason: string }[] = [];
    const zip = new JSZip();
    const seenNames = new Map<string, number>();

    onProgress({
        i: 0,
        n,
        currentName: resolveWorkerName(createdPayrolls[0]!.workerId),
    });

    for (let idx = 0; idx < n; idx++) {
        const { payrollId, workerId } = createdPayrolls[idx]!;
        const workerName = resolveWorkerName(workerId);

        try {
            const { blob } = await generateAndUploadPayrollPdf(payrollId);
            const base = buildPayrollPdfZipEntryName({
                workerName,
                periodStart,
                periodEnd,
            });
            const entryName = makeUniqueZipEntryName(base, seenNames);
            zip.file(entryName, blob);
        } catch (error) {
            failures.push({
                payrollId,
                reason:
                    error instanceof Error ? error.message : "Unknown error",
            });
        }

        const completed = idx + 1;
        if (completed < n) {
            onProgress({
                i: completed,
                n,
                currentName: resolveWorkerName(
                    createdPayrolls[completed]!.workerId,
                ),
            });
        } else {
            onProgress({ i: completed, n });
        }
    }

    onProgress({ i: n, n });

    if (failures.length > 0) {
        zip.file(
            "_download-errors.txt",
            formatPayrollPdfFailuresReport(failures),
        );
    }

    try {
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const filename = buildPayrollCreationZipFilename({
            periodStart,
            periodEnd,
            partial: failures.length > 0,
        });
        triggerBrowserDownload(zipBlob, filename);
        return { ok: true };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Failed to build ZIP";
        return { ok: false, error: message };
    }
}
