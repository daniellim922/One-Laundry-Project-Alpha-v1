"use client";

import * as React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

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
import type { RevertPreviewRow } from "@/services/payroll/get-revert-preview";
import { cn } from "@/lib/utils";
import { RevertPreviewTable } from "./revert-preview-table";

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

type PayrollSettleDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    error: string | null;
    pending: boolean;
    onConfirm: () => void;
};

export function PayrollSettleDialog({
    open,
    onOpenChange,
    error,
    pending,
    onConfirm,
}: PayrollSettleDialogProps) {
    return (
        <ConfirmActionDialog
            open={open}
            onOpenChange={onOpenChange}
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
            onConfirm={onConfirm}
            confirmVariant="default"
            confirmLabel="Yes, settle"
            confirmPendingLabel="Settling..."
        />
    );
}

type PayrollRevertDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    error: string | null;
    pending: boolean;
    onConfirm: () => void;
    previewLoading: boolean;
    previewError: string | null;
    previewData: RevertPreviewRow[] | null;
};

export function PayrollRevertDialog({
    open,
    onOpenChange,
    error,
    pending,
    onConfirm,
    previewLoading,
    previewError,
    previewData,
}: PayrollRevertDialogProps) {
    return (
        <ConfirmActionDialog
            open={open}
            onOpenChange={onOpenChange}
            trigger={
                <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={pending}
                    className="cursor-pointer">
                    Revert
                </Button>
            }
            title="Confirm revert"
            description="The following changes will be applied:"
            warning={
                <p>
                    <span className="font-semibold">Warning: </span>
                    Reverting may break or desynchronize information that
                    depends on this payroll being settled
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
            error={error}
            pending={pending}
            onConfirm={onConfirm}
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
    );
}
