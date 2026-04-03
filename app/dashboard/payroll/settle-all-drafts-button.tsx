"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

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
import {
    getDraftPayrollsForSettlement,
    settleAllDraftPayrolls,
} from "./actions";
import { DataTable } from "@/components/data-table/data-table";
import { columns } from "./all/columns";

export function SettleAllDraftPayrollsButton() {
    const router = useRouter();
    const [open, setOpen] = React.useState(false);
    const [pending, setPending] = React.useState(false);
    const [downloadingZip, setDownloadingZip] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [loadingDrafts, setLoadingDrafts] = React.useState(false);
    const [drafts, setDrafts] = React.useState<
        Awaited<ReturnType<typeof getDraftPayrollsForSettlement>>
    >([]);

    const draftCount = drafts.length;

    React.useEffect(() => {
        let cancelled = false;
        async function load() {
            if (!open) return;
            setLoadingDrafts(true);
            setError(null);
            try {
                const rows = await getDraftPayrollsForSettlement();
                if (cancelled) return;
                setDrafts(rows);
            } catch (e) {
                if (cancelled) return;
                console.error("Failed to load draft payrolls", e);
                setError("Failed to load draft payrolls");
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

    async function handleSettleAll() {
        setError(null);
        setPending(true);

        const result = await settleAllDraftPayrolls();

        setPending(false);
        if (result?.error) {
            setError(result.error);
            return;
        }

        const ids = result?.settledPayrollIds ?? [];
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
        router.refresh();
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                if (!nextOpen) {
                    setError(null);
                    setLoadingDrafts(false);
                }
            }}>
            <DialogTrigger asChild>
                <Button
                    type="button"
                    variant="destructive"
                    disabled={pending || downloadingZip}>
                    Settle all draft payrolls
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-6xl [&_button]:cursor-pointer">
                <DialogHeader>
                    <DialogTitle>Confirm settlement</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to settle{" "}
                        {loadingDrafts ? "Loading..." : `${draftCount}`} draft
                        payrolls?
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium tabular-nums"></p>
                    </div>

                    {loadingDrafts ? (
                        <div className="rounded-md border px-3 py-3 text-sm text-muted-foreground">
                            Loading draft payrolls...
                        </div>
                    ) : (
                        <DataTable
                            columns={columns}
                            data={drafts}
                            syncSearchToUrl={false}
                            pageSize={5}
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
                            draftCount === 0
                        }
                        onClick={handleSettleAll}>
                        {pending
                            ? "Settling..."
                            : downloadingZip
                              ? "Preparing ZIP..."
                              : "Yes, settle all"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
