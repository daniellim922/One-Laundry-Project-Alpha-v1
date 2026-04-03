"use client";

import Link from "next/link";

interface AdvanceStepProgressProps {
    className?: string;
    advanceRequestId: string;
    activeStep: 1 | 2;
}

export function AdvanceStepProgress({
    className,
    advanceRequestId,
    activeStep,
}: AdvanceStepProgressProps) {
    const step1Active = activeStep === 1;
    const step2Active = activeStep === 2;

    return (
        <div className={className}>
            <div className="rounded-xl border bg-card px-4 py-4">
                <div className="flex flex-col gap-3">
                    <Link
                        href={`/dashboard/advance/${advanceRequestId}/breakdown`}
                        className="flex items-center gap-2">
                        <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${
                                step1Active
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-muted-foreground/40 bg-muted text-muted-foreground"
                            }`}>
                            1
                        </div>
                        <span
                            className={`text-sm font-medium ${
                                step1Active
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                            }`}>
                            Advance Breakdown
                        </span>
                    </Link>

                    <div className="flex h-6 pl-3">
                        <div
                            className={`w-0.5 rounded-full ${
                                step2Active ? "bg-primary/80" : "bg-muted"
                            }`}
                        />
                    </div>

                    <Link
                        href={`/dashboard/advance/${advanceRequestId}/summary`}
                        className="flex items-center gap-2">
                        <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${
                                step2Active
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-muted-foreground/40 bg-muted text-muted-foreground"
                            }`}>
                            2
                        </div>
                        <span
                            className={`text-sm font-medium ${
                                step2Active
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                            }`}>
                            Summary & Download
                        </span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
