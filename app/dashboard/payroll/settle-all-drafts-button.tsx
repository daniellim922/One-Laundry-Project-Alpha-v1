"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { RowSelectionState } from "@tanstack/react-table";
import { usePathname, useRouter } from "next/navigation";

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
import { createRowSelectionColumn } from "@/components/data-table/column-builders";
import { DataTable } from "@/components/data-table/data-table";
import {
    settleDraftPayrolls,
} from "./command-api";
import { fetchSettlementCandidates } from "./read-api";
import { columns as baseColumns, type PayrollWithWorker } from "./all/columns";

const selectableColumns: ColumnDef<PayrollWithWorker>[] = [
    createRowSelectionColumn<PayrollWithWorker>({
        ariaLabelForRow: (p) => `Select ${p.workerName}`,
    }),
    ...baseColumns,
];

export function SettleAllDraftPayrollsButton() {
    const router = useRouter();
    const pathname = usePathname();
    const [open, setOpen] = React.useState(false);
    const [pending, setPending] = React.useState(false);
    const [downloadingZip, setDownloadingZip] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [loadingDrafts, setLoadingDrafts] = React.useState(false);
    const [drafts, setDrafts] = React.useState<PayrollWithWorker[]>([]);
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(
        {},
    );

    const draftCount = drafts.length;
    const selectedCount = Object.keys(rowSelection).filter(
        (k) => rowSelection[k],
    ).length;

    const resetSettleDialogUi = React.useCallback(() => {
        setError(null);
        setLoadingDrafts(false);
        setRowSelection({});
    }, []);

    const wasSettleDialogOpen = React.useRef(false);
    const settleDialogOpenedAtPath = React.useRef<string | null>(null);

    React.useEffect(() => {
        if (open && !wasSettleDialogOpen.current) {
            settleDialogOpenedAtPath.current = pathname;
        }
        if (!open) {
            settleDialogOpenedAtPath.current = null;
        }
        wasSettleDialogOpen.current = open;
    }, [open, pathname]);

    React.useEffect(() => {
        if (!open || settleDialogOpenedAtPath.current === null) return;
        if (pathname !== settleDialogOpenedAtPath.current) {
            setOpen(false);
            resetSettleDialogUi();
        }
    }, [pathname, open, resetSettleDialogUi]);

    React.useEffect(() => {
        let cancelled = false;
        async function load() {
            if (!open) return;
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
    }, [open]);

    function getDownloadFilenameFromContentDisposition(
        header: string | null,
    ): string | null {
        if (!header) return null;

        // Prefer RFC5987 `filename*=UTF-8''...`
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

        // Fallback to `filename="..."`
        const plain = header.match(/filename\s*=\s*([^;]+)/i);
        if (plain?.[1]) {
            return plain[1].trim().replace(/^"(.*)"$/, "$1");
        }

        return null;
    }

    async function handleSettleSelected() {
        const selectedIds = Object.keys(rowSelection).filter(
            (k) => rowSelection[k],
        );
        if (selectedIds.length === 0) return;

        setError(null);
        setPending(true);

        const result = await settleDraftPayrolls(selectedIds);

        setPending(false);
        if ("error" in result) {
            setError(result.error);
            return;
        }

        const ids = result.settledPayrollIds;
        if (ids.length > 0) {
            setDownloadingZip(true);
            try {
                const res = await fetch("/api/payroll/download-zip", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ payrollIds: ids }),
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
                    ) ??
                    `payrolls-${new Date().toISOString().slice(0, 10)}.zip`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
            } catch (e) {
                console.error(e);
                setError("Failed to download payroll PDFs ZIP");
                setDownloadingZip(false);
                return;
            } finally {
                setDownloadingZip(false);
            }
        }

        setOpen(false);
        resetSettleDialogUi();
        router.refresh();
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                if (!nextOpen) {
                    resetSettleDialogUi();
                }
            }}>
            <DialogTrigger asChild>
                <Button
                    type="button"
                    variant="destructive"
                    disabled={pending || downloadingZip}>
                    Settle all Draft payrolls
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-6xl [&_button]:cursor-pointer">
                <DialogHeader>
                    <DialogTitle>Confirm settlement</DialogTitle>
                    <DialogDescription>
                        {loadingDrafts
                            ? "Loading Draft payrolls…"
                            : draftCount === 0
                              ? "There are no Draft payrolls to settle."
                              : "Select the Draft payrolls you want to settle. All rows are selected by default."}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                    <DataTable
                        columns={selectableColumns}
                        data={drafts as PayrollWithWorker[]}
                        syncSearchToUrl={false}
                        pageSize={5}
                        enableRowSelection
                        rowSelection={rowSelection}
                        onRowSelectionChange={setRowSelection}
                        getRowId={(row) => row.id}
                        isLoading={loadingDrafts}
                        skeletonColumnCount={selectableColumns.length}
                        skeletonRowCount={10}
                    />
                </div>
                {error ? (
                    <p className="text-sm text-destructive">{error}</p>
                ) : null}
                <DialogFooter>
                    <DialogClose asChild>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={pending || downloadingZip}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        type="button"
                        variant="destructive"
                        disabled={
                            pending ||
                            downloadingZip ||
                            loadingDrafts ||
                            selectedCount === 0
                        }
                        onClick={handleSettleSelected}>
                        {pending
                            ? "Settling..."
                            : downloadingZip
                              ? "Preparing ZIP..."
                              : `Settle selected (${selectedCount})`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
