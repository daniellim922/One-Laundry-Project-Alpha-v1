"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
    StepProgressPanel,
    type StepProgressItem,
} from "@/components/ui/step-progress-panel";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

import { settlePayroll } from "../actions";

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
    const isSettled = payrollStatus === "Settled";

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

            if (result?.error) {
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

    const finalAction = isSettled ? (
        <Button type="button" variant="outline" size="sm" disabled>
            Settled
        </Button>
    ) : (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                if (!nextOpen) setError(null);
            }}>
            <DialogTrigger asChild>
                <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={pending}
                    className="cursor-pointer">
                    Settle
                </Button>
            </DialogTrigger>
            <DialogContent className="[&_button]:cursor-pointer">
                <DialogHeader>
                    <DialogTitle>Confirm settlement</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to settle this payroll?
                    </DialogDescription>
                </DialogHeader>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline" disabled={pending}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        type="button"
                        variant="destructive"
                        disabled={pending}
                        onClick={handleSettle}>
                        {pending ? "Settling..." : "Yes, settle"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
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
