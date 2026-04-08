"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

type DownloadTriggerSource = "auto" | "manual";

const AUTO_DOWNLOAD_FAILED_MESSAGE =
    "Automatic download failed. Use Download PDF to retry.";
const MANUAL_DOWNLOAD_FAILED_MESSAGE = "Failed to download PDF. Please try again.";

export function removeQueryParam(
    searchParams: URLSearchParams,
    param: string,
): string {
    const next = new URLSearchParams(searchParams.toString());
    next.delete(param);
    return next.toString();
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    return MANUAL_DOWNLOAD_FAILED_MESSAGE;
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
    const [downloadError, setDownloadError] = useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const isGeneratingRef = useRef(false);
    const consumedAutoDownloadKeyRef = useRef<string | null>(null);

    const handleDownloadPdf = useCallback(
        async (source: DownloadTriggerSource = "manual") => {
            if (isGeneratingRef.current) return false;

            isGeneratingRef.current = true;
            setDownloadError(null);
            setIsGenerating(true);

            try {
                await onDownload();
                return true;
            } catch (error) {
                if (source === "auto") {
                    setDownloadError(AUTO_DOWNLOAD_FAILED_MESSAGE);
                } else {
                    setDownloadError(getErrorMessage(error));
                }
                return false;
            } finally {
                isGeneratingRef.current = false;
                setIsGenerating(false);
            }
        },
        [onDownload],
    );

    useEffect(() => {
        if (searchParams.get("download") !== "1") {
            consumedAutoDownloadKeyRef.current = null;
            return;
        }

        const path = window.location.pathname;
        const currentSearch = searchParams.toString();
        const autoDownloadKey = `${path}?${currentSearch}`;

        if (consumedAutoDownloadKeyRef.current === autoDownloadKey) return;
        consumedAutoDownloadKeyRef.current = autoDownloadKey;

        const qs = removeQueryParam(new URLSearchParams(currentSearch), "download");
        router.replace(qs ? `${path}?${qs}` : path, { scroll: false });

        void handleDownloadPdf("auto");
    }, [handleDownloadPdf, searchParams, router]);

    return (
        <div className={cn("w-full space-y-3", className)}>
            <div className="w-full print:hidden">
                <Button
                    size="lg"
                    className="h-12 w-full text-base"
                    onClick={() => {
                        void handleDownloadPdf("manual");
                    }}
                    disabled={isGenerating}>
                    <Download className="mr-2 h-4 w-4" />
                    {isGenerating ? generatingLabel : buttonLabel}
                </Button>
                {downloadError ? (
                    <p className="mt-2 text-sm text-destructive">{downloadError}</p>
                ) : null}
            </div>

            <div className={cn("w-full print:bg-white", downloadClassName)}>
                {children}
            </div>
        </div>
    );
}
