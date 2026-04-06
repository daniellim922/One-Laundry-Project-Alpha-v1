"use client";

import { SummaryCapture } from "@/components/ui/summary-capture";

function isoToDdmmyyyy(iso: string): string {
    const s = String(iso).slice(0, 10);
    const [y, m, d] = s.split("-");
    if (!y || !m || !d) return s;
    return `${d}_${m}_${y}`;
}

export function AdvanceSummaryCapture(props: {
    advanceRequestId: string;
    workerName: string;
    amountRequested: number;
    requestDate: string;
    children: React.ReactNode;
}) {
    const {
        advanceRequestId,
        workerName,
        amountRequested,
        requestDate,
        children,
    } = props;

    async function downloadAdvancePdf() {
        const res = await fetch(`/api/advance/${advanceRequestId}/pdf`, {
            method: "GET",
            cache: "no-store",
        });
        if (!res.ok) throw new Error(`PDF download failed (${res.status})`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${workerName} - Advance - $${amountRequested} - ${isoToDdmmyyyy(requestDate)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    return (
        <SummaryCapture
            onDownload={downloadAdvancePdf}
            downloadClassName="space-y-3 download-advance">
            {children}
        </SummaryCapture>
    );
}
