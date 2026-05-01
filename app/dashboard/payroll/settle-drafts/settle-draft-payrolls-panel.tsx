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
import { fetchSettlementCandidates } from "@/app/dashboard/payroll/read-api";
import { selectableColumns } from "@/app/dashboard/payroll/_shared/selectable-columns";
import type { PayrollWithWorker } from "@/app/dashboard/payroll/columns";

export function SettleDraftPayrollsPanel() {
    const router = useRouter();
    const [error, setError] = React.useState<string | null>(null);
    const [loadingDrafts, setLoadingDrafts] = React.useState(true);
    const [settling, setSettling] = React.useState(false);
    const [drafts, setDrafts] = React.useState<PayrollWithWorker[]>([]);
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(
        {},
    );

    const draftCount = drafts.length;
    const selectedCount = Object.keys(rowSelection).filter(
        (k) => rowSelection[k],
    ).length;

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
        setSettling(true);

        const result = await settleDraftPayrolls(selectedIds);

        if ("error" in result) {
            setError(result.error);
            setSettling(false);
            return;
        }

        router.push("/dashboard/payroll/all");
    }

    return (
        <Card>
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
                            settling || loadingDrafts || selectedCount === 0
                        }
                        onClick={handleSettleSelected}>
                        {settling
                            ? "Settling..."
                            : `Settle selected (${selectedCount})`}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
