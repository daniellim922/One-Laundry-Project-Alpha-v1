"use client";

import { useCallback } from "react";

import { SummaryCapture } from "@/components/ui/summary-capture";
import { downloadBlobResponse } from "@/lib/client/download-blob";

export function SummaryCaptureDownload(props: {
    pdfUrl: string;
    filename: string;
    downloadClassName?: string;
    children: React.ReactNode;
}) {
    const { pdfUrl, filename, downloadClassName, children } = props;

    const handleDownload = useCallback(async () => {
        const res = await fetch(pdfUrl, { method: "GET", cache: "no-store" });
        await downloadBlobResponse(res, filename);
    }, [pdfUrl, filename]);

    return (
        <SummaryCapture onDownload={handleDownload} downloadClassName={downloadClassName}>
            {children}
        </SummaryCapture>
    );
}
