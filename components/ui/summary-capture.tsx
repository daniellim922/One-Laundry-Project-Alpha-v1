"use client";

import { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SummaryCaptureProps {
    onDownload: () => Promise<void>;
    children: React.ReactNode;
    buttonLabel?: string;
    generatingLabel?: string;
    className?: string;
    downloadClassName?: string;
}

export function removeQueryParam(
    searchParams: URLSearchParams,
    param: string,
): string {
    const next = new URLSearchParams(searchParams.toString());
    next.delete(param);
    return next.toString();
}

export function SummaryCapture({
    onDownload,
    children,
    buttonLabel = "Download PDF",
    generatingLabel = "Generating…",
    className,
    downloadClassName,
}: SummaryCaptureProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleDownloadPdf = useCallback(async () => {
        if (isGenerating) return;

        setIsGenerating(true);
        try {
            await onDownload();
        } finally {
            setIsGenerating(false);
        }
    }, [isGenerating, onDownload]);

    useEffect(() => {
        if (searchParams.get("download") !== "1") return;

        let cancelled = false;

        async function run() {
            await handleDownloadPdf();
            if (cancelled) return;

            const path = window.location.pathname;
            const qs = removeQueryParam(new URLSearchParams(searchParams.toString()), "download");
            router.replace(qs ? `${path}?${qs}` : path, { scroll: false });
        }

        requestAnimationFrame(() => {
            void run();
        });

        return () => {
            cancelled = true;
        };
    }, [handleDownloadPdf, searchParams, router]);

    return (
        <div className={cn("w-full space-y-3", className)}>
            <div className="w-full print:hidden">
                <Button
                    size="lg"
                    className="h-12 w-full text-base"
                    onClick={handleDownloadPdf}
                    disabled={isGenerating}>
                    <Download className="mr-2 h-4 w-4" />
                    {isGenerating ? generatingLabel : buttonLabel}
                </Button>
            </div>

            <div className={cn("w-full print:bg-white", downloadClassName)}>
                {children}
            </div>
        </div>
    );
}
