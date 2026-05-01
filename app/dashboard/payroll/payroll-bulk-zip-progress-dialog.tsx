"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { IndeterminateProgress } from "@/components/ui/indeterminate-progress";
import { Progress } from "@/components/ui/progress";

export type PayrollZipProgressPhase = "settling" | "generating";

function formatMmSs(totalSeconds: number): string {
    if (totalSeconds >= 3600) {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatElapsed(totalSeconds: number): string {
    return formatMmSs(totalSeconds);
}

function phaseLabel(phase: PayrollZipProgressPhase): string {
    return phase === "settling"
        ? "Settling payrolls…"
        : "Generating PDFs and building ZIP…";
}

export type PayrollBulkZipProgressState = {
    i: number;
    n: number;
    currentName?: string;
};

export type PayrollBulkZipProgressDialogProps = {
    open: boolean;
    phase: PayrollZipProgressPhase;
    error: string | null;
    onDismiss: () => void;
    progress?: PayrollBulkZipProgressState | null;
    etaSec?: number;
};

export function PayrollBulkZipProgressDialog({
    open,
    phase,
    error,
    onDismiss,
    progress,
    etaSec,
}: PayrollBulkZipProgressDialogProps) {
    const [elapsedSec, setElapsedSec] = React.useState(0);
    const inFlight = open && error === null;

    React.useEffect(() => {
        if (!open) {
            setElapsedSec(0);
            return;
        }
        const started = Date.now();
        setElapsedSec(0);
        const id = window.setInterval(() => {
            setElapsedSec(Math.floor((Date.now() - started) / 1000));
        }, 250);
        return () => window.clearInterval(id);
    }, [open]);

    const showDeterminate =
        progress != null &&
        progress.n > 0 &&
        phase === "generating";

    const finalizing =
        showDeterminate &&
        progress != null &&
        progress.i === progress.n &&
        progress.n > 0;

    const percent = showDeterminate
        ? Math.min(
              100,
              Math.round(
                  ((progress?.i ?? 0) / (progress?.n ?? 1)) * 100,
              ),
          )
        : 0;

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next && error !== null) {
                    onDismiss();
                }
            }}>
            <DialogContent
                showCloseButton={false}
                onPointerDownOutside={(e) => {
                    if (inFlight) e.preventDefault();
                }}
                onEscapeKeyDown={(e) => {
                    if (inFlight) e.preventDefault();
                }}
                className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {error ? "Something went wrong" : "Preparing download"}
                    </DialogTitle>
                    {error ? (
                        <DialogDescription className="text-destructive">
                            {error}
                        </DialogDescription>
                    ) : (
                        <DialogDescription className="sr-only">
                            {phaseLabel(phase)} Elapsed{" "}
                            {formatElapsed(elapsedSec)}.
                        </DialogDescription>
                    )}
                </DialogHeader>
                {!error ? (
                    <div
                        className="space-y-4"
                        aria-live="polite"
                        aria-atomic="true">
                        {showDeterminate ? (
                            <>
                                {finalizing ? (
                                    <>
                                        <p className="text-foreground text-sm">
                                            Finalizing ZIP…
                                        </p>
                                        <Progress
                                            value={100}
                                            aria-valuenow={100}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                        />
                                    </>
                                ) : (
                                    <Field>
                                        <FieldLabel className="flex w-full items-center justify-between">
                                            <span>{`${progress?.i ?? 0} of ${progress?.n ?? 0} files finished processing`}</span>
                                            <span className="text-muted-foreground tabular-nums">
                                                {percent}%
                                            </span>
                                        </FieldLabel>
                                        <Progress
                                            value={percent}
                                            aria-valuenow={percent}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                        />
                                        {progress?.currentName ? (
                                            <p className="text-muted-foreground truncate text-xs">
                                                Current: {progress.currentName}
                                            </p>
                                        ) : null}
                                    </Field>
                                )}
                                <div className="text-muted-foreground flex items-center justify-between text-xs tabular-nums">
                                    <span>
                                        Elapsed: {formatElapsed(elapsedSec)}
                                    </span>
                                    {finalizing ? null : etaSec !==
                                      undefined ? (
                                        <span aria-live="polite">
                                            About {formatMmSs(etaSec)} remaining
                                        </span>
                                    ) : (
                                        <span className="opacity-60">
                                            Estimating…
                                        </span>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-foreground text-sm">
                                    {phaseLabel(phase)}
                                </p>
                                <IndeterminateProgress />
                                <p className="text-muted-foreground text-xs">
                                    Elapsed: {formatElapsed(elapsedSec)}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    Larger selections can take several minutes.
                                </p>
                            </>
                        )}
                    </div>
                ) : null}
                {error ? (
                    <DialogFooter>
                        <Button type="button" onClick={onDismiss}>
                            Dismiss
                        </Button>
                    </DialogFooter>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
