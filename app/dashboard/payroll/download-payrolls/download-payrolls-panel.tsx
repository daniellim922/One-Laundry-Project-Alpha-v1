"use client";

import * as React from "react";
import type { RowSelectionState } from "@tanstack/react-table";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/data-table/data-table";
import {
    PayrollBulkZipProgressDialog,
} from "@/app/dashboard/payroll/payroll-bulk-zip-progress-dialog";
import { fetchPayrollDownloadSelection } from "@/app/dashboard/payroll/read-api";
import { selectableColumns } from "@/app/dashboard/payroll/_shared/selectable-columns";
import { usePayrollZipProgress } from "@/app/dashboard/payroll/_shared/use-payroll-zip-progress";
import type { PayrollWithWorker } from "@/app/dashboard/payroll/columns";

export function DownloadPayrollsPanel() {
    const router = useRouter();
    const [error, setError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [payrolls, setPayrolls] = React.useState<PayrollWithWorker[]>([]);
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(
        {},
    );

    const {
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
    } = usePayrollZipProgress();

    const selectedCount = Object.keys(rowSelection).filter(
        (k) => rowSelection[k],
    ).length;

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

    async function handleDownload() {
        const selectedIds = Object.keys(rowSelection).filter(
            (k) => rowSelection[k],
        );
        if (selectedIds.length === 0) return;

        setError(null);
        setZipError(null);
        setZipProgress(null);
        prepareZipStreamTiming();
        setZipPhase("generating");
        setZipDialogOpen(true);

        const result = await streamWithProgress(selectedIds);
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
