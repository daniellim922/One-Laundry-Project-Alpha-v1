"use client";

import { SummaryCapture } from "@/components/ui/summary-capture";

function isoToDdmmyyyy(iso: string): string {
    const s = String(iso).slice(0, 10);
    const [y, m, d] = s.split("-");
    if (!y || !m || !d) return s;
    return `${d}_${m}_${y}`;
}

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
        if (!res.ok) throw new Error(`PDF download failed (${res.status})`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${workerName} - ${isoToDdmmyyyy(periodStart)}-${isoToDdmmyyyy(periodEnd)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    return (
        <SummaryCapture
            onDownload={downloadPayrollSummaryPdf}
            downloadClassName="space-y-3 download-payroll">
            {children}
        </SummaryCapture>
    );
}
