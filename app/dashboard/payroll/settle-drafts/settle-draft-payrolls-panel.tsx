"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { RowSelectionState } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { createRowSelectionColumn } from "@/components/data-table/column-builders";
import { DataTable } from "@/components/data-table/data-table";
import { settleDraftPayrolls } from "@/app/dashboard/payroll/command-api";
import {
    computeZipEtaSec,
    streamPayrollZipFromApi,
} from "@/app/dashboard/payroll/download-payroll-zip-client";
import {
    PayrollBulkZipProgressDialog,
    type PayrollBulkZipProgressState,
    type PayrollZipProgressPhase,
} from "@/app/dashboard/payroll/payroll-bulk-zip-progress-dialog";
import { fetchSettlementCandidates } from "@/app/dashboard/payroll/read-api";
import {
    columns as baseColumns,
    type PayrollWithWorker,
} from "@/app/dashboard/payroll/columns";

const selectableColumns: ColumnDef<PayrollWithWorker>[] = [
    createRowSelectionColumn<PayrollWithWorker>({
        ariaLabelForRow: (p) => `Select ${p.workerName}`,
    }),
    ...baseColumns,
];

export function SettleDraftPayrollsPanel() {
    const router = useRouter();
    const [error, setError] = React.useState<string | null>(null);
    const [loadingDrafts, setLoadingDrafts] = React.useState(true);
    const [drafts, setDrafts] = React.useState<PayrollWithWorker[]>([]);
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(
        {},
    );
    const [zipDialogOpen, setZipDialogOpen] = React.useState(false);
    const [zipPhase, setZipPhase] =
        React.useState<PayrollZipProgressPhase>("settling");
    const [zipError, setZipError] = React.useState<string | null>(null);
    const [zipProgress, setZipProgress] =
        React.useState<PayrollBulkZipProgressState | null>(null);
    const [zipTick, setZipTick] = React.useState(0);
    const zipStartedAtRef = React.useRef<number | null>(null);
    const lastProgressAtRef = React.useRef<number | null>(null);
    const durationsRef = React.useRef<number[]>([]);

    const draftCount = drafts.length;
    const selectedCount = Object.keys(rowSelection).filter(
        (k) => rowSelection[k],
    ).length;

    const resetUi = React.useCallback(() => {
        setError(null);
    }, []);

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

    React.useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoadingDrafts(true);
            setError(null);
            setRowSelection({});
            try {
                const rows = await fetchSettlementCandidates();
                if (cancelled) return;
                setDrafts(rows as PayrollWithWorker[]);
                setRowSelection(
                    Object.fromEntries(rows.map((r) => [r.id, true])),
                );
            } catch (e) {
                if (cancelled) return;
                console.error("Failed to load Draft payrolls", e);
                setError("Failed to load Draft payrolls");
            } finally {
                if (cancelled) return;
                setLoadingDrafts(false);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, []);

    function dismissZipDialog() {
        setZipDialogOpen(false);
        setZipError(null);
        setZipProgress(null);
    }

    async function handleSettleSelected() {
        const selectedIds = Object.keys(rowSelection).filter(
            (k) => rowSelection[k],
        );
        if (selectedIds.length === 0) return;

        setError(null);
        setZipError(null);
        setZipProgress(null);
        setZipPhase("settling");
        setZipDialogOpen(true);

        const result = await settleDraftPayrolls(selectedIds);

        if ("error" in result) {
            setZipError(result.error);
            return;
        }

        const ids = result.settledPayrollIds;
        if (ids.length === 0) {
            setZipDialogOpen(false);
            setZipProgress(null);
            resetUi();
            router.refresh();
            return;
        }

        setZipPhase("generating");
        zipStartedAtRef.current = Date.now();
        lastProgressAtRef.current = null;
        durationsRef.current = [];
        setZipProgress(null);

        const zipResult = await streamPayrollZipFromApi(ids, (evt) => {
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
        });
        if (!zipResult.ok) {
            setZipError(zipResult.error);
            return;
        }

        setZipDialogOpen(false);
        setZipProgress(null);
        resetUi();
        router.refresh();
    }

    return (
        <Card>
            <PayrollBulkZipProgressDialog
                open={zipDialogOpen}
                phase={zipPhase}
                error={zipError}
                onDismiss={dismissZipDialog}
                progress={zipProgress}
                etaSec={zipEtaSec}
            />
            <CardHeader>
                <CardTitle>Confirm settlement</CardTitle>
                <CardDescription>
                    {loadingDrafts
                        ? "Loading Draft payrolls…"
                        : draftCount === 0
                          ? "There are no Draft payrolls to settle."
                          : "Select the Draft payrolls you want to settle. All rows are selected by default."}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div
                    role="alert"
                    className="flex gap-2 rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <AlertTriangle
                        className="mt-0.5 size-4 shrink-0"
                        aria-hidden
                    />
                    <p>
                        <span className="font-semibold">Warning: </span>
                        Only settle after workers have been paid and at least
                        <span className="font-bold"> TWO WEEKS </span>
                        have passed since payment.
                    </p>
                </div>
                <DataTable
                    columns={selectableColumns}
                    data={drafts as PayrollWithWorker[]}
                    syncSearchToUrl={false}
                    enableRowSelection
                    rowSelection={rowSelection}
                    onRowSelectionChange={setRowSelection}
                    getRowId={(row) => row.id}
                    isLoading={loadingDrafts}
                    skeletonColumnCount={selectableColumns.length}
                    skeletonRowCount={20}
                />
                {error ? (
                    <p className="text-sm text-destructive">{error}</p>
                ) : null}
                <div className="flex flex-wrap justify-end gap-2">
                    <Button
                        type="button"
                        variant="destructive"
                        disabled={
                            zipDialogOpen ||
                            loadingDrafts ||
                            selectedCount === 0
                        }
                        onClick={handleSettleSelected}>
                        {zipBusy
                            ? zipPhase === "settling"
                                ? "Settling..."
                                : "Preparing ZIP..."
                            : `Settle selected (${selectedCount})`}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
