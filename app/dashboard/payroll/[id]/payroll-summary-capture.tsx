"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

export function PayrollSummaryCapture(props: {
    payrollId: string;
    workerName: string;
    periodStart: string;
    periodEnd: string;
    children: React.ReactNode;
}) {
    const { payrollId, workerName, periodStart, periodEnd, children } = props;
    const rootRef = useRef<HTMLDivElement | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    function isoToDdmmyyyy(iso: string): string {
        const s = String(iso).slice(0, 10);
        const [y, m, d] = s.split("-");
        if (!y || !m || !d) return s;
        return `${d}_${m}_${y}`;
    }

    async function handleDownloadPdf() {
        if (isGenerating) return;

        setIsGenerating(true);
        try {
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
        } finally {
            setIsGenerating(false);
        }
    }

    useEffect(() => {
        if (searchParams.get("download") !== "1") return;

        let cancelled = false;
        async function run() {
            await handleDownloadPdf();
            if (cancelled) return;

            const path = window.location.pathname;
            const next = new URLSearchParams(searchParams.toString());
            next.delete("download");
            const qs = next.toString();
            router.replace(qs ? `${path}?${qs}` : path, { scroll: false });
        }

        // Defer to ensure the voucher/timesheet DOM is mounted.
        requestAnimationFrame(() => {
            void run();
        });

        return () => {
            cancelled = true;
        };
    }, [searchParams, router, workerName, periodStart, periodEnd]);

    return (
        <div className="space-y-3">
            <div className="w-full print:hidden">
                <Button
                    size="lg"
                    className="h-12 w-full text-base"
                    onClick={handleDownloadPdf}
                    disabled={isGenerating}>
                    <Download className="mr-2 h-4 w-4" />
                    {isGenerating ? "Generating…" : "Download PDF"}
                </Button>
            </div>

            <div ref={rootRef} className="space-y-3 printable-payroll print:bg-white">
                {children}
            </div>
        </div>
    );
}

