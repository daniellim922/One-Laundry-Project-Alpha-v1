"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { RowSelectionState } from "@tanstack/react-table";
import { Download } from "lucide-react";
import { usePathname } from "next/navigation";

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
import { DataTable } from "@/components/data-table/data-table";
import { createRowSelectionColumn } from "@/components/data-table/column-builders";
import { columns as baseColumns, type PayrollWithWorker } from "./all/columns";
import { getAllPayrollsForDownload } from "./actions";

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

export function DownloadPayrollsButton() {
    const pathname = usePathname();
    const [open, setOpen] = React.useState(false);
    const [downloading, setDownloading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [payrolls, setPayrolls] = React.useState<PayrollWithWorker[]>([]);
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(
        {},
    );

    const selectedCount = Object.keys(rowSelection).filter(
        (k) => rowSelection[k],
    ).length;

    const resetDownloadDialogUi = React.useCallback(() => {
        setError(null);
        setLoading(false);
    }, []);

    const wasDownloadDialogOpen = React.useRef(false);
    const downloadDialogOpenedAtPath = React.useRef<string | null>(null);

    React.useEffect(() => {
        if (open && !wasDownloadDialogOpen.current) {
            downloadDialogOpenedAtPath.current = pathname;
        }
        if (!open) {
            downloadDialogOpenedAtPath.current = null;
        }
        wasDownloadDialogOpen.current = open;
    }, [open, pathname]);

    React.useEffect(() => {
        if (!open || downloadDialogOpenedAtPath.current === null) return;
        if (pathname !== downloadDialogOpenedAtPath.current) {
            setOpen(false);
            resetDownloadDialogUi();
        }
    }, [pathname, open, resetDownloadDialogUi]);

    React.useEffect(() => {
        let cancelled = false;
        async function load() {
            if (!open) return;
            setLoading(true);
            setError(null);
            setRowSelection({});
            try {
                const rows = await getAllPayrollsForDownload();
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
    }, [open]);

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
            setOpen(false);
            resetDownloadDialogUi();
        } catch (e) {
            console.error(e);
            setError("Failed to download payroll PDFs");
        } finally {
            setDownloading(false);
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                if (!nextOpen) {
                    resetDownloadDialogUi();
                }
            }}>
            <DialogTrigger asChild>
                <Button type="button" variant="outline" disabled={downloading}>
                    <Download className="mr-2 h-4 w-4" />
                    Download payrolls
                </Button>
            </DialogTrigger>
            <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] flex-col sm:max-w-[calc(100vw-2rem)] [&_button]:cursor-pointer">
                <DialogHeader>
                    <DialogTitle>Download payrolls</DialogTitle>
                    <DialogDescription>
                        Select the payrolls you want to download as a ZIP of PDF
                        summaries.
                    </DialogDescription>
                </DialogHeader>
                <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-auto">
                    {loading ? (
                        <div className="rounded-md border px-3 py-3 text-sm text-muted-foreground">
                            Loading payrolls...
                        </div>
                    ) : (
                        <DataTable
                            columns={selectableColumns}
                            data={payrolls}
                            syncSearchToUrl={false}
                            pageSize={20}
                            enableRowSelection
                            rowSelection={rowSelection}
                            onRowSelectionChange={setRowSelection}
                            getRowId={(row) => row.id}
                        />
                    )}
                </div>
                {error ? (
                    <p className="text-sm text-destructive">{error}</p>
                ) : null}
                <DialogFooter>
                    <DialogClose asChild>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={downloading}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        type="button"
                        disabled={
                            downloading || loading || selectedCount === 0
                        }
                        onClick={handleDownload}>
                        {downloading
                            ? "Preparing ZIP..."
                            : `Download selected (${selectedCount})`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
