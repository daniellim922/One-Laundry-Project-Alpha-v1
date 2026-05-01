"use client";

import * as React from "react";
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
import { DataTable } from "@/components/data-table/data-table";
import { settleDraftPayrolls } from "@/app/dashboard/payroll/command-api";
import {
    PayrollBulkZipProgressDialog,
} from "@/app/dashboard/payroll/payroll-bulk-zip-progress-dialog";
import { fetchSettlementCandidates } from "@/app/dashboard/payroll/read-api";
import { selectableColumns } from "@/app/dashboard/payroll/_shared/selectable-columns";
import { usePayrollZipProgress } from "@/app/dashboard/payroll/_shared/use-payroll-zip-progress";
import type { PayrollWithWorker } from "@/app/dashboard/payroll/columns";

export function SettleDraftPayrollsPanel() {
    const router = useRouter();
    const [error, setError] = React.useState<string | null>(null);
    const [loadingDrafts, setLoadingDrafts] = React.useState(true);
    const [drafts, setDrafts] = React.useState<PayrollWithWorker[]>([]);
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

    const draftCount = drafts.length;
    const selectedCount = Object.keys(rowSelection).filter(
        (k) => rowSelection[k],
    ).length;

    const resetUi = React.useCallback(() => {
        setError(null);
    }, []);

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
        prepareZipStreamTiming();
        setZipProgress(null);

        const zipResult = await streamWithProgress(ids);
        if (!zipResult.ok) {
            setZipError(zipResult.error);
            return;
        }

        setZipDialogOpen(false);
        setZipProgress(null);
        resetUi();
        router.push("/dashboard/payroll/all");
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
