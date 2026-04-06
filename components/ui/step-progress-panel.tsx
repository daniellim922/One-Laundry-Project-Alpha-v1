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
                <div className="flex flex-col gap-3">
                    {steps.map((step, index) => {
                        const isActive = activeStep === step.id;
                        const hasNext = index < steps.length - 1 || finalAction != null;

                        return (
                            <div key={step.id}>
                                <Link
                                    href={step.href}
                                    className="flex items-center gap-2">
                                    <StepCircle stepId={step.id} isActive={isActive} />
                                    <span
                                        className={`text-sm font-medium ${
                                            isActive
                                                ? "text-foreground"
                                                : "text-muted-foreground"
                                        }`}>
                                        {step.label}
                                    </span>
                                </Link>

                                {hasNext ? (
                                    <StepConnector
                                        isActive={activeStep === step.id + 1}
                                    />
                                ) : null}
                            </div>
                        );
                    })}

                    {finalAction ? (
                        <div className="flex items-center gap-2">
                            <StepCircle
                                stepId={finalAction.id}
                                isActive={activeStep === finalAction.id}
                            />
                            {finalAction.content}
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
            className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${
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
        <div className="flex h-6 pl-3">
            <div
                className={`w-0.5 rounded-full ${
                    isActive ? "bg-primary/80" : "bg-muted"
                }`}
            />
        </div>
    );
}
