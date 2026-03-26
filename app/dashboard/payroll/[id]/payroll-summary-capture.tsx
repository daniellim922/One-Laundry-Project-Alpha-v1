"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { downloadPayrollVoucherAndTimesheetPdf } from "@/lib/payroll-download-summary";

export function PayrollSummaryCapture(props: {
    workerName: string;
    periodStart: string;
    periodEnd: string;
    children: React.ReactNode;
}) {
    const { workerName, periodStart, periodEnd, children } = props;
    const rootRef = useRef<HTMLDivElement | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    async function handleDownloadPdf() {
        const root = rootRef.current;
        if (!root || isGenerating) return;

        const voucherElement = root.querySelector<HTMLElement>(".voucher-print-root");
        const timesheetElement =
            root.querySelector<HTMLElement>(".timesheet-print-compact");
        if (!voucherElement || !timesheetElement) return;

        setIsGenerating(true);
        try {
            await downloadPayrollVoucherAndTimesheetPdf({
                voucherElement,
                timesheetElement,
                workerName,
                periodStart,
                periodEnd,
            });
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

