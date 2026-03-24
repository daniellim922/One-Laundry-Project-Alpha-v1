"use client";

import Link from "next/link";
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

interface PayrollStepProgressProps {
    className?: string;
    payrollId: string;
    activeStep: 1 | 2 | 3;
}

export function PayrollStepProgress({
    className,
    payrollId,
    activeStep,
}: PayrollStepProgressProps) {
    const step1Active = activeStep === 1;
    const step2Active = activeStep === 2;
    const step3Active = activeStep === 3;

    return (
        <div className={className}>
            <div className="rounded-xl border bg-card px-4 py-4">
                <div className="flex flex-col gap-3">
                    <Link
                        href={`/dashboard/payroll/${payrollId}/breakdown`}
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
                            Employment Breakdown / Payroll Voucher / Timesheet
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
                        href={`/dashboard/payroll/${payrollId}/summary`}
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
                            Printable Voucher & Timesheet
                        </span>
                    </Link>

                    <div className="flex h-6 pl-3">
                        <div
                            className={`w-0.5 rounded-full ${
                                step3Active ? "bg-primary/80" : "bg-muted"
                            }`}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${
                                step3Active
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-muted-foreground/40 bg-muted text-muted-foreground"
                            }`}>
                            3
                        </div>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
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
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button type="button" variant="outline">
                                            Cancel
                                        </Button>
                                    </DialogClose>
                                    <DialogClose asChild>
                                        <Button type="button" variant="destructive">
                                            Yes, settle
                                        </Button>
                                    </DialogClose>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>
        </div>
    );
}
