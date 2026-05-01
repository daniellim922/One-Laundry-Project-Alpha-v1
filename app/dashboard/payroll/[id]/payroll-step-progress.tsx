"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronDown, Eye, Loader2 } from "lucide-react";

import {
    StepProgressPanel,
    type StepProgressItem,
} from "@/components/ui/step-progress-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import { settlePayroll, revertPayroll } from "../command-api";
import type { RevertPreviewRow } from "@/services/payroll/get-revert-preview";
import { cn } from "@/lib/utils";
import {
    payrollStatusBadgeTone,
    timesheetPaymentStatusBadgeTone,
    installmentToneClassName,
    advanceLoanToneClassName,
} from "@/types/badge-tones";
import { formatEnGbDmyNumericFromCalendar } from "@/utils/time/intl-en-gb";
import { localTimeHm } from "@/utils/time/local-time";
import { fetchRevertPreview } from "../read-api";

const statusToneMap: Record<string, string> = {
    ...payrollStatusBadgeTone,
    ...timesheetPaymentStatusBadgeTone,
    ...installmentToneClassName,
    ...advanceLoanToneClassName,
};

interface PayrollStepProgressProps {
    className?: string;
    payrollId: string;
    payrollStatus: string;
    activeStep: 1 | 2 | 3;
}

function StatusBadgePair({
    currentStatus,
    futureStatus,
}: {
    currentStatus: string;
    futureStatus: string;
}) {
    return (
        <>
            <TableCell>
                <Badge
                    variant="secondary"
                    className={cn(statusToneMap[currentStatus])}>
                    {currentStatus}
                </Badge>
            </TableCell>
            <TableCell>
                <Badge
                    variant="secondary"
                    className={cn(statusToneMap[futureStatus])}>
                    {futureStatus}
                </Badge>
            </TableCell>
        </>
    );
}

function ConfirmActionDialog({
    open,
    onOpenChange,
    trigger,
    title,
    description,
    warning,
    children,
    error,
    pending,
    onConfirm,
    confirmVariant,
    confirmLabel,
    confirmPendingLabel,
    dialogContentClassName,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    trigger: React.ReactElement;
    title: string;
    description: string;
    warning: React.ReactNode;
    children?: React.ReactNode;
    error: string | null;
    pending: boolean;
    onConfirm: () => void;
    confirmVariant: "default" | "destructive";
    confirmLabel: string;
    confirmPendingLabel: string;
    dialogContentClassName?: string;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent
                className={cn(
                    "[&_button]:cursor-pointer flex flex-col gap-4",
                    dialogContentClassName,
                )}>
                <DialogHeader className="shrink-0">
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <div
                    role="alert"
                    className="shrink-0 flex gap-2 rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <AlertTriangle
                        className="mt-0.5 size-4 shrink-0"
                        aria-hidden
                    />
                    <div>{warning}</div>
                </div>
                {children}
                {error ? (
                    <p className="shrink-0 text-sm text-destructive">{error}</p>
                ) : null}
                <DialogFooter className="shrink-0">
                    <DialogClose asChild>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={pending}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        type="button"
                        variant={confirmVariant}
                        disabled={pending}
                        onClick={onConfirm}>
                        {pending ? confirmPendingLabel : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
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
        <ConfirmActionDialog
            open={revertOpen}
            onOpenChange={(nextOpen) => {
                setRevertOpen(nextOpen);
                if (!nextOpen) setRevertError(null);
            }}
            trigger={
                <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={revertPending}
                    className="cursor-pointer">
                    Revert
                </Button>
            }
            title="Confirm revert"
            description="The following changes will be applied:"
            warning={
                <p>
                    <span className="font-semibold">Warning: </span>
                    Reverting may break or desynchronize information that depends
                    on this payroll being settled
                    <br />
                    (for example reports, exports, or linked timesheet or
                    payment records).
                    <br />
                    <span className="font-bold">
                        ONLY CONTINUE IF YOU UNDERSTAND THE IMPACT.
                    </span>
                </p>
            }
            dialogContentClassName="max-h-[min(95vh,1100px)] sm:max-w-6xl"
            error={revertError}
            pending={revertPending}
            onConfirm={handleRevert}
            confirmVariant="destructive"
            confirmLabel="Yes, revert"
            confirmPendingLabel="Reverting...">
            <div className="min-h-0 flex-1 overflow-y-auto">
                {previewLoading ? (
                    <div className="flex items-center gap-2 py-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">
                            Loading preview...
                        </span>
                    </div>
                ) : previewError ? (
                    <p className="text-sm text-destructive">{previewError}</p>
                ) : previewData ? (
                    <RevertPreviewTable rows={previewData} />
                ) : null}
            </div>
        </ConfirmActionDialog>
    ) : (
        <ConfirmActionDialog
            open={open}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                if (!nextOpen) setError(null);
            }}
            trigger={
                <Button
                    type="button"
                    variant="default"
                    size="sm"
                    disabled={pending}
                    className="cursor-pointer">
                    Settle
                </Button>
            }
            title="Confirm settlement"
            description="Are you sure you want to settle this payroll?"
            warning={
                <p>
                    <span className="font-semibold">Warning: </span>
                    Only settle after workers have been paid and at least
                    <span className="font-bold"> TWO WEEKS </span> have passed
                    since payment.
                </p>
            }
            error={error}
            pending={pending}
            onConfirm={handleSettle}
            confirmVariant="default"
            confirmLabel="Yes, settle"
            confirmPendingLabel="Settling..."
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

function revertPreviewRowIsExpandable(row: RevertPreviewRow): boolean {
    return (
        (row.timesheetLines?.length ?? 0) > 0 ||
        (row.advanceInstallmentLines?.length ?? 0) > 0
    );
}

function RevertPreviewExpandedLines({ row }: { row: RevertPreviewRow }) {
    if (row.timesheetLines?.length) {
        return (
            <Table className="text-sm">
                <TableHeader>
                    <TableRow>
                        <TableHead>Current Status</TableHead>
                        <TableHead>Future Status</TableHead>
                        <TableHead>Date in</TableHead>
                        <TableHead>Date out</TableHead>
                        <TableHead>Time in</TableHead>
                        <TableHead>Time out</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead className="text-right">View</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {row.timesheetLines.map((line) => (
                        <TableRow key={line.id}>
                            <StatusBadgePair
                                currentStatus={row.currentStatus}
                                futureStatus={row.futureStatus}
                            />
                            <TableCell>
                                {formatEnGbDmyNumericFromCalendar(line.dateIn)}
                            </TableCell>
                            <TableCell>
                                {formatEnGbDmyNumericFromCalendar(line.dateOut)}
                            </TableCell>
                            <TableCell>{localTimeHm(line.timeIn)}</TableCell>
                            <TableCell>{localTimeHm(line.timeOut)}</TableCell>
                            <TableCell>
                                {Number(line.hours).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    asChild>
                                    <Link
                                        href={`/dashboard/timesheet/${line.id}/view`}
                                        aria-label="View">
                                        <Eye className="size-4" aria-hidden />
                                    </Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    }

    if (row.advanceInstallmentLines?.length) {
        return (
            <Table className="text-sm">
                <TableHeader>
                    <TableRow>
                        <TableHead>Current Status</TableHead>
                        <TableHead>Future Status</TableHead>
                        <TableHead>Repayment date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead className="text-right">View</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {row.advanceInstallmentLines.map((line) => (
                        <TableRow key={line.id}>
                            <StatusBadgePair
                                currentStatus={row.currentStatus}
                                futureStatus={row.futureStatus}
                            />
                            <TableCell>
                                {line.repaymentDate
                                    ? formatEnGbDmyNumericFromCalendar(
                                          line.repaymentDate,
                                      )
                                    : "—"}
                            </TableCell>
                            <TableCell>{`$${line.amount}`}</TableCell>
                            <TableCell className="text-right">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    asChild>
                                    <Link
                                        href={`/dashboard/advance/${line.advanceRequestId}`}
                                        aria-label="View">
                                        <Eye className="size-4" aria-hidden />
                                    </Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    }

    return null;
}

function RevertPreviewTable({ rows }: { rows: RevertPreviewRow[] }) {
    const [expandedRowNames, setExpandedRowNames] = React.useState<
        Record<string, boolean>
    >({});

    function toggleRowExpanded(name: string) {
        setExpandedRowNames((prev) => ({
            ...prev,
            [name]: !prev[name],
        }));
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Current Status</TableHead>
                    <TableHead>Future Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {rows.map((row) => {
                    if (revertPreviewRowIsExpandable(row)) {
                        const expanded = !!expandedRowNames[row.name];
                        return (
                            <React.Fragment key={row.name}>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        <button
                                            type="button"
                                            aria-expanded={expanded}
                                            onClick={() =>
                                                toggleRowExpanded(row.name)
                                            }
                                            className="flex cursor-pointer items-center gap-2 text-left underline-offset-4 hover:underline">
                                            <ChevronDown
                                                className={cn(
                                                    "size-4 shrink-0 transition-transform",
                                                    expanded && "rotate-180",
                                                )}
                                            />
                                            <span>{row.name}</span>
                                        </button>
                                    </TableCell>
                                    <StatusBadgePair
                                        currentStatus={row.currentStatus}
                                        futureStatus={row.futureStatus}
                                    />
                                </TableRow>
                                {expanded ? (
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell colSpan={3} className="p-0">
                                            <div className="max-h-96 overflow-y-auto border-t bg-muted/40 px-4 py-3">
                                                <RevertPreviewExpandedLines
                                                    row={row}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : null}
                            </React.Fragment>
                        );
                    }

                    return (
                        <TableRow key={row.name}>
                            <TableCell className="font-medium">
                                {row.name}
                            </TableCell>
                            <StatusBadgePair
                                currentStatus={row.currentStatus}
                                futureStatus={row.futureStatus}
                            />
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}
