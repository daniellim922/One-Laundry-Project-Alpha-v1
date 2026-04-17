"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { RowSelectionState } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/data-table/data-table";
import { createRowSelectionColumn } from "@/components/data-table/column-builders";
import {
    columns as baseColumns,
    type PayrollWithWorker,
} from "@/app/dashboard/payroll/columns";
import { fetchPayrollDownloadSelection } from "@/app/dashboard/payroll/read-api";

const selectableColumns: ColumnDef<PayrollWithWorker>[] = [
    createRowSelectionColumn<PayrollWithWorker>({
        ariaLabelForRow: (p) => `Select ${p.workerName}`,
    }),
    ...baseColumns,
];

function getDownloadFilenameFromContentDisposition(
    header: string | null,
): string | null {
    if (!header) return null;

    const star = header.match(/filename\*\s*=\s*([^;]+)/i);
    if (star?.[1]) {
        const raw = star[1].trim();
        const unquoted = raw.replace(/^"(.*)"$/, "$1");
        const parts = unquoted.split("''");
        const encoded = parts.length === 2 ? parts[1] : unquoted;
        try {
            return decodeURIComponent(encoded);
        } catch {
            return encoded;
        }
    }

    const plain = header.match(/filename\s*=\s*([^;]+)/i);
    if (plain?.[1]) {
        return plain[1].trim().replace(/^"(.*)"$/, "$1");
    }

    return null;
}

export function DownloadPayrollsPanel() {
    const [downloading, setDownloading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [payrolls, setPayrolls] = React.useState<PayrollWithWorker[]>([]);
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(
        {},
    );

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
        setDownloading(true);

        try {
            const res = await fetch("/api/payroll/download-zip", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ payrollIds: selectedIds }),
            });
            if (!res.ok) {
                throw new Error(`ZIP download failed (${res.status})`);
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download =
                getDownloadFilenameFromContentDisposition(
                    res.headers.get("content-disposition"),
                ) ?? `payrolls-${new Date().toISOString().slice(0, 10)}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error(e);
            setError("Failed to download payroll PDFs");
        } finally {
            setDownloading(false);
        }
    }

    return (
        <Card>
            <CardContent className="space-y-4 pt-6">
                <p className="text-muted-foreground text-sm">
                    Select the payrolls you want to download as a ZIP of PDF
                    summaries.
                </p>
                <div className="max-h-[min(75vh,64rem)] min-h-0 overflow-auto">
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
                        disabled={downloading || loading || selectedCount === 0}
                        onClick={handleDownload}>
                        {downloading
                            ? "Preparing ZIP..."
                            : `Download selected (${selectedCount})`}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
