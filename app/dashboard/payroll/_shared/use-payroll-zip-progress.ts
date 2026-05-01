"use client";

import * as React from "react";

import {
    computeZipEtaSec,
    streamPayrollZipFromApi,
    type PayrollZipStreamProgressEvent,
} from "@/app/dashboard/payroll/download-payroll-zip-client";
import {
    type PayrollBulkZipProgressState,
    type PayrollZipProgressPhase,
} from "@/app/dashboard/payroll/payroll-bulk-zip-progress-dialog";

export function usePayrollZipProgress() {
    const [zipDialogOpen, setZipDialogOpen] = React.useState(false);
    const [zipPhase, setZipPhase] =
        React.useState<PayrollZipProgressPhase>("generating");
    const [zipError, setZipError] = React.useState<string | null>(null);
    const [zipProgress, setZipProgress] =
        React.useState<PayrollBulkZipProgressState | null>(null);
    const [zipTick, setZipTick] = React.useState(0);
    const zipStartedAtRef = React.useRef<number | null>(null);
    const lastProgressAtRef = React.useRef<number | null>(null);
    const durationsRef = React.useRef<number[]>([]);

    const zipBusy = zipDialogOpen && zipError === null;

    React.useEffect(() => {
        if (!zipDialogOpen) return;
        const id = window.setInterval(() => {
            setZipTick((t) => t + 1);
        }, 250);
        return () => window.clearInterval(id);
    }, [zipDialogOpen]);

    const zipEtaSec = React.useMemo(() => {
        if (!zipProgress) return undefined;
        const elapsedSec = zipStartedAtRef.current
            ? Math.floor((Date.now() - zipStartedAtRef.current) / 1000)
            : 0;
        return computeZipEtaSec({
            n: zipProgress.n,
            i: zipProgress.i,
            elapsedSec,
            recentDurationsSec: durationsRef.current,
        });
    }, [zipProgress, zipTick]);

    const dismissZipDialog = React.useCallback(() => {
        setZipDialogOpen(false);
        setZipError(null);
        setZipProgress(null);
    }, []);

    const prepareZipStreamTiming = React.useCallback(() => {
        zipStartedAtRef.current = Date.now();
        lastProgressAtRef.current = null;
        durationsRef.current = [];
    }, []);

    const onZipStreamEvent = React.useCallback(
        (evt: PayrollZipStreamProgressEvent) => {
            if (evt.type === "meta") {
                setZipProgress({ i: 0, n: evt.n });
                lastProgressAtRef.current = Date.now();
                durationsRef.current = [];
            }
            if (evt.type === "progress") {
                const now = Date.now();
                if (lastProgressAtRef.current !== null) {
                    const dt = (now - lastProgressAtRef.current) / 1000;
                    if (dt >= 0) {
                        durationsRef.current = [
                            ...durationsRef.current.slice(-4),
                            dt,
                        ];
                    }
                }
                lastProgressAtRef.current = now;
                setZipProgress({
                    i: evt.i,
                    n: evt.n,
                    currentName: evt.workerName,
                });
            }
        },
        [],
    );

    const streamWithProgress = React.useCallback(
        (payrollIds: string[]) =>
            streamPayrollZipFromApi(payrollIds, onZipStreamEvent),
        [onZipStreamEvent],
    );

    return {
        zipDialogOpen,
        setZipDialogOpen,
        zipPhase,
        setZipPhase,
        zipError,
        setZipError,
        zipProgress,
        setZipProgress,
        zipEtaSec,
        zipBusy,
        dismissZipDialog,
        prepareZipStreamTiming,
        streamWithProgress,
    };
}
