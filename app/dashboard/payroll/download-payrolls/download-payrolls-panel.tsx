"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { RowSelectionState } from "@tanstack/react-table";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/data-table/data-table";
import { createRowSelectionColumn } from "@/components/data-table/column-builders";
import {
    columns as baseColumns,
    type PayrollWithWorker,
} from "@/app/dashboard/payroll/columns";
import {
    computeZipEtaSec,
    streamPayrollZipFromApi,
} from "@/app/dashboard/payroll/download-payroll-zip-client";
import {
    PayrollBulkZipProgressDialog,
    type PayrollBulkZipProgressState,
    type PayrollZipProgressPhase,
} from "@/app/dashboard/payroll/payroll-bulk-zip-progress-dialog";
import { fetchPayrollDownloadSelection } from "@/app/dashboard/payroll/read-api";

const selectableColumns: ColumnDef<PayrollWithWorker>[] = [
    createRowSelectionColumn<PayrollWithWorker>({
        ariaLabelForRow: (p) => `Select ${p.workerName}`,
    }),
    ...baseColumns,
];

export function DownloadPayrollsPanel() {
    const router = useRouter();
    const [error, setError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [payrolls, setPayrolls] = React.useState<PayrollWithWorker[]>([]);
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(
        {},
    );
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

    const selectedCount = Object.keys(rowSelection).filter(
        (k) => rowSelection[k],
    ).length;

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
            setLoading(true);
            setError(null);
            setRowSelection({});
            try {
                const rows = await fetchPayrollDownloadSelection();
                if (cancelled) return;
                setPayrolls(rows as PayrollWithWorker[]);
            } catch (e) {
                if (cancelled) return;
                console.error("Failed to load payrolls", e);
                setError("Failed to load payrolls");
            } finally {
                if (cancelled) return;
                setLoading(false);
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

    async function handleDownload() {
        const selectedIds = Object.keys(rowSelection).filter(
            (k) => rowSelection[k],
        );
        if (selectedIds.length === 0) return;

        setError(null);
        setZipError(null);
        setZipProgress(null);
        zipStartedAtRef.current = Date.now();
        lastProgressAtRef.current = null;
        durationsRef.current = [];
        setZipPhase("generating");
        setZipDialogOpen(true);

        const result = await streamPayrollZipFromApi(
            selectedIds,
            (evt) => {
                if (evt.type === "meta") {
                    setZipProgress({ i: 0, n: evt.n });
                    lastProgressAtRef.current = Date.now();
                    durationsRef.current = [];
                }
                if (evt.type === "progress") {
                    const now = Date.now();
                    if (lastProgressAtRef.current !== null) {
                        const dt =
                            (now - lastProgressAtRef.current) / 1000;
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
        );
        if (!result.ok) {
            setZipError(result.error);
            return;
        }

        setZipDialogOpen(false);
        setZipProgress(null);
        router.push("/dashboard/payroll/all");
    }

    return (
        <Card>
            <CardContent className="space-y-4 pt-6">
                <PayrollBulkZipProgressDialog
                    open={zipDialogOpen}
                    phase={zipPhase}
                    error={zipError}
                    onDismiss={dismissZipDialog}
                    progress={zipProgress}
                    etaSec={zipEtaSec}
                />
                <p className="text-muted-foreground text-sm">
                    Select the payrolls you want to download as a ZIP of PDF
                    summaries.
                </p>
                <div className="min-h-0 min-w-0">
                    <DataTable
                        columns={selectableColumns}
                        data={payrolls}
                        syncSearchToUrl={false}
                        pageSize={20}
                        enableRowSelection
                        rowSelection={rowSelection}
                        onRowSelectionChange={setRowSelection}
                        getRowId={(row) => row.id}
                        isLoading={loading}
                        skeletonColumnCount={selectableColumns.length}
                        skeletonRowCount={20}
                    />
                </div>
                {error ? (
                    <p className="text-sm text-destructive">{error}</p>
                ) : null}
                <div className="flex flex-wrap justify-end gap-2">
                    <Button
                        type="button"
                        disabled={
                            zipDialogOpen || loading || selectedCount === 0
                        }
                        onClick={handleDownload}>
                        {zipBusy
                            ? "Preparing ZIP..."
                            : `Download selected (${selectedCount})`}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
