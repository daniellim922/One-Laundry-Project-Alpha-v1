"use client";

import { SummaryCapture } from "@/components/ui/summary-capture";
import { downloadBlobResponse } from "@/lib/client/download-blob";
import { isoToDdmmyyyy } from "@/lib/pdf-filename-parts";

export function PayrollSummaryCapture(props: {
    payrollId: string;
    workerName: string;
    periodStart: string;
    periodEnd: string;
    children: React.ReactNode;
}) {
    const { payrollId, workerName, periodStart, periodEnd, children } = props;

    async function downloadPayrollSummaryPdf() {
        const res = await fetch(`/api/payroll/${payrollId}/pdf?mode=summary`, {
            method: "GET",
            cache: "no-store",
        });
        await downloadBlobResponse(
            res,
            `${workerName} - ${isoToDdmmyyyy(periodStart)}-${isoToDdmmyyyy(periodEnd)}.pdf`,
        );
    }

    return (
        <SummaryCapture
            onDownload={downloadPayrollSummaryPdf}
            downloadClassName="space-y-3 download-payroll">
            {children}
        </SummaryCapture>
    );
}
