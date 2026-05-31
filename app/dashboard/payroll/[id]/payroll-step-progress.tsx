"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
    StepProgressPanel,
    type StepProgressItem,
} from "@/components/ui/step-progress-panel";

import { settlePayroll, revertPayroll } from "../command-api";
import type { RevertPreviewRow } from "@/services/payroll/get-revert-preview";
import { fetchRevertPreview } from "../read-api";
import {
    PayrollRevertDialog,
    PayrollSettleDialog,
} from "./_shared/payroll-settle-revert-dialogs";

interface PayrollStepProgressProps {
    className?: string;
    payrollId: string;
    payrollStatus: string;
    activeStep: 1 | 2 | 3;
}

export function PayrollStepProgress({
    className,
    payrollId,
    payrollStatus,
    activeStep,
}: PayrollStepProgressProps) {
    const router = useRouter();
    const [open, setOpen] = React.useState(false);
    const [pending, setPending] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const settleInFlightRef = React.useRef(false);

    const [revertOpen, setRevertOpen] = React.useState(false);
    const [revertPending, setRevertPending] = React.useState(false);
    const [revertError, setRevertError] = React.useState<string | null>(null);
    const revertInFlightRef = React.useRef(false);

    const [previewLoading, setPreviewLoading] = React.useState(false);
    const [previewData, setPreviewData] = React.useState<
        RevertPreviewRow[] | null
    >(null);
    const [previewError, setPreviewError] = React.useState<string | null>(null);

    const isSettled = payrollStatus === "Settled";

    React.useEffect(() => {
        if (!revertOpen) {
            setPreviewData(null);
            setPreviewError(null);
            return;
        }
        let cancelled = false;
        setPreviewLoading(true);
        fetchRevertPreview(payrollId)
            .then((data) => {
                if (cancelled) return;
                setPreviewData(data);
            })
            .catch((error: unknown) => {
                if (cancelled) return;
                setPreviewError(
                    error instanceof Error
                        ? error.message
                        : "Failed to load revert preview",
                );
            })
            .finally(() => {
                if (cancelled) return;
                setPreviewLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [revertOpen, payrollId]);

    const steps: StepProgressItem[] = [
        {
            id: 1,
            label: "Employment Breakdown / Payroll Voucher / Timesheet",
            href: `/dashboard/payroll/${payrollId}/breakdown`,
        },
        {
            id: 2,
            label: "Voucher & Timesheet Download",
            href: `/dashboard/payroll/${payrollId}/summary`,
        },
    ];

    async function handleSettle() {
        if (settleInFlightRef.current) return;

        settleInFlightRef.current = true;
        setError(null);
        setPending(true);

        try {
            const result = await settlePayroll(payrollId);

            if ("error" in result) {
                setError(result.error);
                return;
            }

            setOpen(false);
            router.push(`/dashboard/payroll/${payrollId}/summary?download=1`);
        } finally {
            settleInFlightRef.current = false;
            setPending(false);
        }
    }

    async function handleRevert() {
        if (revertInFlightRef.current) return;

        revertInFlightRef.current = true;
        setRevertError(null);
        setRevertPending(true);

        try {
            const result = await revertPayroll(payrollId);

            if ("error" in result) {
                setRevertError(result.error);
                return;
            }

            setRevertOpen(false);
            router.push(`/dashboard/payroll/${payrollId}/breakdown`);
        } finally {
            revertInFlightRef.current = false;
            setRevertPending(false);
        }
    }

    const finalAction = isSettled ? (
        <PayrollRevertDialog
            open={revertOpen}
            onOpenChange={(nextOpen) => {
                setRevertOpen(nextOpen);
                if (!nextOpen) setRevertError(null);
            }}
            error={revertError}
            pending={revertPending}
            onConfirm={handleRevert}
            previewLoading={previewLoading}
            previewError={previewError}
            previewData={previewData}
        />
    ) : (
        <PayrollSettleDialog
            open={open}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                if (!nextOpen) setError(null);
            }}
            error={error}
            pending={pending}
            onConfirm={handleSettle}
        />
    );

    return (
        <StepProgressPanel
            className={className}
            steps={steps}
            activeStep={activeStep}
            finalAction={{ id: 3, content: finalAction }}
        />
    );
}
