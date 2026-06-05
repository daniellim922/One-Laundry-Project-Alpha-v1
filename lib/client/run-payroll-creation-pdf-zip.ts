"use client";

import {
    streamPayrollZipFromApi,
    type PayrollZipStreamProgressEvent,
} from "@/app/dashboard/payroll/download-payroll-zip-client";
import { isoToDdmmyyyy, safeFilenamePart } from "@/lib/pdf-filename-parts";

export type PayrollCreationPdfZipProgress = {
    i: number;
    n: number;
    currentName?: string;
};

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
 * After batch payroll creation: download a ZIP of stored voucher PDFs from the
 * server (PDFs are generated server-side during payroll creation).
 */
export async function runPayrollCreationPdfZip(args: {
    createdPayrolls: { payrollId: string; workerId: string }[];
    resolveWorkerName: (workerId: string) => string;
    periodStart: string;
    periodEnd: string;
    onProgress: (state: PayrollCreationPdfZipProgress) => void;
}): Promise<{ ok: true } | { ok: false; error: string }> {
    const { createdPayrolls, onProgress } = args;
    const n = createdPayrolls.length;
    if (n === 0) {
        return { ok: true };
    }

    const payrollIds = createdPayrolls.map((row) => row.payrollId);
    let total = n;

    return streamPayrollZipFromApi(
        payrollIds,
        (event: PayrollZipStreamProgressEvent) => {
            if (event.type === "meta") {
                total = event.n;
                onProgress({ i: 0, n: event.n });
                return;
            }
            if (event.type === "progress") {
                onProgress({
                    i: event.i,
                    n: event.n,
                    currentName: event.workerName,
                });
                return;
            }
            if (event.type === "done") {
                onProgress({ i: total, n: total });
            }
        },
    );
}
