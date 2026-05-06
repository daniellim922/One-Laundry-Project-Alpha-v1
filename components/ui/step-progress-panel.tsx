import Link from "next/link";
import type { ReactNode } from "react";

export type StepProgressItem = {
    id: number;
    label: string;
    href: string;
};

export type StepProgressFinalAction = {
    id: number;
    content: ReactNode;
};

interface StepProgressPanelProps {
    steps: StepProgressItem[];
    activeStep: number;
    finalAction?: StepProgressFinalAction;
    className?: string;
}

export function StepProgressPanel({
    steps,
    activeStep,
    finalAction,
    className,
}: StepProgressPanelProps) {
    return (
        <div className={className}>
            <div className="rounded-xl border bg-card px-4 py-4">
                <div className="flex flex-col">
                    {steps.map((step, index) => {
                        const isActive = activeStep === step.id;
                        const hasNext =
                            index < steps.length - 1 || finalAction != null;

                        return (
                            <div
                                key={step.id}
                                className="flex items-start gap-2">
                                <div className="flex flex-col items-center">
                                    <StepCircle
                                        stepId={step.id}
                                        isActive={isActive}
                                    />
                                    {hasNext ? (
                                        <StepConnector
                                            isActive={
                                                activeStep === step.id + 1
                                            }
                                        />
                                    ) : null}
                                </div>
                                <div className="flex min-h-7 min-w-0 flex-1 items-center">
                                    <Link
                                        href={step.href}
                                        className="inline-flex items-center">
                                        <span
                                            className={`text-sm font-medium ${
                                                isActive
                                                    ? "text-foreground"
                                                    : "text-muted-foreground"
                                            }`}>
                                            {step.label}
                                        </span>
                                    </Link>
                                </div>
                            </div>
                        );
                    })}

                    {finalAction ? (
                        <div className="flex items-start gap-2">
                            <div className="flex flex-col items-center">
                                <StepCircle
                                    stepId={finalAction.id}
                                    isActive={
                                        activeStep === finalAction.id
                                    }
                                />
                            </div>
                            <div className="flex min-h-7 min-w-0 flex-1 flex-wrap items-center gap-2">
                                {finalAction.content}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

function StepCircle({
    stepId,
    isActive,
}: {
    stepId: number;
    isActive: boolean;
}) {
    return (
        <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/40 bg-muted text-muted-foreground"
            }`}>
            {stepId}
        </div>
    );
}

function StepConnector({ isActive }: { isActive: boolean }) {
    return (
        <div className="flex h-6 w-7 shrink-0 flex-col items-center">
            <div
                className={`h-full w-0.5 rounded-full ${
                    isActive ? "bg-primary/80" : "bg-muted"
                }`}
            />
        </div>
    );
}
