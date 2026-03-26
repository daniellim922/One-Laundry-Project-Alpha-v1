"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, MoreHorizontal } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    getDraftPayrollsForSettlement,
    settleAllDraftPayrolls,
} from "./actions";

type SortKey =
    | "workerName"
    | "status"
    | "employmentType"
    | "employmentArrangement"
    | "periodStart"
    | "periodEnd"
    | "payrollDate";

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
    const [sort, setSort] = React.useState<{ key: SortKey | null; dir: "asc" | "desc" }>(
        { key: null, dir: "asc" },
    );
    const [filters, setFilters] = React.useState({
        worker: "",
        status: "all",
        employmentType: "all",
        arrangement: "all",
        periodStart: "",
        periodEnd: "",
        payrollDate: "",
    });

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

    React.useEffect(() => {
        if (!open) return;
        setSort({ key: null, dir: "asc" });
        setFilters({
            worker: "",
            status: "all",
            employmentType: "all",
            arrangement: "all",
            periodStart: "",
            periodEnd: "",
            payrollDate: "",
        });
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
                const res = await fetch("/api/payroll/settled-zip", {
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
                    ) ?? `payrolls-${new Date().toISOString().slice(0, 10)}.zip`;
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

    function formatDate(d: string | Date): string {
        const date = d instanceof Date ? d : new Date(d + "T00:00:00");
        return date.toLocaleDateString("en-GB", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
    }

    const statusOptions = React.useMemo(() => {
        const values = Array.from(new Set(drafts.map((d) => d.status))).filter(Boolean);
        values.sort((a, b) => String(a).localeCompare(String(b)));
        return values;
    }, [drafts]);

    const employmentTypeOptions = React.useMemo(() => {
        const values = Array.from(new Set(drafts.map((d) => d.employmentType))).filter(
            Boolean,
        );
        values.sort((a, b) => String(a).localeCompare(String(b)));
        return values;
    }, [drafts]);

    const arrangementOptions = React.useMemo(() => {
        const values = Array.from(
            new Set(drafts.map((d) => d.employmentArrangement)),
        ).filter(Boolean);
        values.sort((a, b) => String(a).localeCompare(String(b)));
        return values;
    }, [drafts]);

    function toggleSort(key: SortKey) {
        setSort((prev) => {
            if (prev.key !== key) return { key, dir: "asc" };
            if (prev.dir === "asc") return { key, dir: "desc" };
            return { key: null, dir: "asc" };
        });
    }

    const draftsView = React.useMemo(() => {
        const fWorker = filters.worker.trim().toLowerCase();
        const fPeriodStart = filters.periodStart.trim().toLowerCase();
        const fPeriodEnd = filters.periodEnd.trim().toLowerCase();
        const fPayrollDate = filters.payrollDate.trim().toLowerCase();

        const filtered = drafts.filter((p) => {
            if (fWorker && !p.workerName.toLowerCase().includes(fWorker)) return false;
            if (filters.status !== "all" && String(p.status) !== filters.status) return false;
            if (
                filters.employmentType !== "all" &&
                String(p.employmentType) !== filters.employmentType
            )
                return false;
            if (
                filters.arrangement !== "all" &&
                String(p.employmentArrangement) !== filters.arrangement
            )
                return false;
            if (fPeriodStart && !formatDate(p.periodStart).toLowerCase().includes(fPeriodStart))
                return false;
            if (fPeriodEnd && !formatDate(p.periodEnd).toLowerCase().includes(fPeriodEnd))
                return false;
            if (fPayrollDate && !formatDate(p.payrollDate).toLowerCase().includes(fPayrollDate))
                return false;
            return true;
        });

        const sortKey = sort.key;
        if (!sortKey) return filtered;

        const sorted = filtered
            .map((item, idx) => ({ item, idx }))
            .sort((a, b) => {
                const dir = sort.dir === "asc" ? 1 : -1;
                const ka = a.item[sortKey];
                const kb = b.item[sortKey];

                if (ka == null && kb == null) return a.idx - b.idx;
                if (ka == null) return 1;
                if (kb == null) return -1;

                const va = String(ka).toLowerCase();
                const vb = String(kb).toLowerCase();
                const cmp = va.localeCompare(vb);
                if (cmp !== 0) return cmp * dir;
                return a.idx - b.idx;
            })
            .map((x) => x.item);

        return sorted;
    }, [drafts, filters, sort]);

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
                        Are you sure you want to settle all draft payrolls?
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-muted-foreground">
                            Draft payrolls to settle
                        </p>
                        <p className="text-sm font-medium tabular-nums">
                            {loadingDrafts
                                ? "Loading..."
                                : `${draftCount} total`}
                        </p>
                    </div>

                    <div className="max-h-72 overflow-auto rounded-md border">
                        <div className="min-w-full">
                            <div className="grid grid-cols-[2fr_1fr_1.5fr_1.5fr_1fr_1fr_1fr_auto] gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground">
                                <div className="flex flex-col gap-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="h-auto justify-start p-0 text-xs font-semibold text-muted-foreground hover:bg-transparent"
                                        onClick={() => toggleSort("workerName")}>
                                        Worker
                                        {sort.key === "workerName" ? (
                                            sort.dir === "asc" ? (
                                                <ChevronUp className="ml-1 h-3 w-3" />
                                            ) : (
                                                <ChevronDown className="ml-1 h-3 w-3" />
                                            )
                                        ) : null}
                                    </Button>
                                    <Input
                                        value={filters.worker}
                                        onChange={(e) =>
                                            setFilters((p) => ({
                                                ...p,
                                                worker: e.target.value,
                                            }))
                                        }
                                        placeholder="Search…"
                                        className="h-7 px-2 text-xs"
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="h-auto justify-start p-0 text-xs font-semibold text-muted-foreground hover:bg-transparent"
                                        onClick={() => toggleSort("status")}>
                                        Status
                                        {sort.key === "status" ? (
                                            sort.dir === "asc" ? (
                                                <ChevronUp className="ml-1 h-3 w-3" />
                                            ) : (
                                                <ChevronDown className="ml-1 h-3 w-3" />
                                            )
                                        ) : null}
                                    </Button>
                                    <Select
                                        value={filters.status}
                                        onValueChange={(value) =>
                                            setFilters((p) => ({ ...p, status: value }))
                                        }>
                                        <SelectTrigger size="sm" className="h-7 w-full px-2">
                                            <SelectValue placeholder="All" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            {statusOptions.map((v) => (
                                                <SelectItem key={String(v)} value={String(v)}>
                                                    {String(v)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="h-auto justify-start p-0 text-xs font-semibold text-muted-foreground hover:bg-transparent"
                                        onClick={() => toggleSort("employmentType")}>
                                        Employment Type
                                        {sort.key === "employmentType" ? (
                                            sort.dir === "asc" ? (
                                                <ChevronUp className="ml-1 h-3 w-3" />
                                            ) : (
                                                <ChevronDown className="ml-1 h-3 w-3" />
                                            )
                                        ) : null}
                                    </Button>
                                    <Select
                                        value={filters.employmentType}
                                        onValueChange={(value) =>
                                            setFilters((p) => ({
                                                ...p,
                                                employmentType: value,
                                            }))
                                        }>
                                        <SelectTrigger size="sm" className="h-7 w-full px-2">
                                            <SelectValue placeholder="All" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            {employmentTypeOptions.map((v) => (
                                                <SelectItem key={String(v)} value={String(v)}>
                                                    {String(v)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="h-auto justify-start p-0 text-xs font-semibold text-muted-foreground hover:bg-transparent"
                                        onClick={() => toggleSort("employmentArrangement")}>
                                        Arrangement
                                        {sort.key === "employmentArrangement" ? (
                                            sort.dir === "asc" ? (
                                                <ChevronUp className="ml-1 h-3 w-3" />
                                            ) : (
                                                <ChevronDown className="ml-1 h-3 w-3" />
                                            )
                                        ) : null}
                                    </Button>
                                    <Select
                                        value={filters.arrangement}
                                        onValueChange={(value) =>
                                            setFilters((p) => ({ ...p, arrangement: value }))
                                        }>
                                        <SelectTrigger size="sm" className="h-7 w-full px-2">
                                            <SelectValue placeholder="All" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            {arrangementOptions.map((v) => (
                                                <SelectItem key={String(v)} value={String(v)}>
                                                    {String(v)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="h-auto justify-start p-0 text-xs font-semibold text-muted-foreground hover:bg-transparent"
                                        onClick={() => toggleSort("periodStart")}>
                                        Period Start
                                        {sort.key === "periodStart" ? (
                                            sort.dir === "asc" ? (
                                                <ChevronUp className="ml-1 h-3 w-3" />
                                            ) : (
                                                <ChevronDown className="ml-1 h-3 w-3" />
                                            )
                                        ) : null}
                                    </Button>
                                    <Input
                                        value={filters.periodStart}
                                        onChange={(e) =>
                                            setFilters((p) => ({
                                                ...p,
                                                periodStart: e.target.value,
                                            }))
                                        }
                                        placeholder="DD/MM/YYYY"
                                        className="h-7 px-2 text-xs"
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="h-auto justify-start p-0 text-xs font-semibold text-muted-foreground hover:bg-transparent"
                                        onClick={() => toggleSort("periodEnd")}>
                                        Period End
                                        {sort.key === "periodEnd" ? (
                                            sort.dir === "asc" ? (
                                                <ChevronUp className="ml-1 h-3 w-3" />
                                            ) : (
                                                <ChevronDown className="ml-1 h-3 w-3" />
                                            )
                                        ) : null}
                                    </Button>
                                    <Input
                                        value={filters.periodEnd}
                                        onChange={(e) =>
                                            setFilters((p) => ({
                                                ...p,
                                                periodEnd: e.target.value,
                                            }))
                                        }
                                        placeholder="DD/MM/YYYY"
                                        className="h-7 px-2 text-xs"
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="h-auto justify-start p-0 text-xs font-semibold text-muted-foreground hover:bg-transparent"
                                        onClick={() => toggleSort("payrollDate")}>
                                        Payroll Date
                                        {sort.key === "payrollDate" ? (
                                            sort.dir === "asc" ? (
                                                <ChevronUp className="ml-1 h-3 w-3" />
                                            ) : (
                                                <ChevronDown className="ml-1 h-3 w-3" />
                                            )
                                        ) : null}
                                    </Button>
                                    <Input
                                        value={filters.payrollDate}
                                        onChange={(e) =>
                                            setFilters((p) => ({
                                                ...p,
                                                payrollDate: e.target.value,
                                            }))
                                        }
                                        placeholder="DD/MM/YYYY"
                                        className="h-7 px-2 text-xs"
                                    />
                                </div>

                                <div className="flex flex-col items-end justify-between gap-1">
                                    <div className="text-xs">Actions</div>
                                </div>
                            </div>

                            {loadingDrafts ? (
                                <div className="px-3 py-3 text-sm text-muted-foreground">
                                    Loading draft payrolls...
                                </div>
                            ) : draftCount === 0 ? (
                                <div className="px-3 py-3 text-sm text-muted-foreground">
                                    No draft payrolls found.
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {draftsView.map((p) => (
                                        <div
                                            key={p.id}
                                            className="grid grid-cols-[2fr_1fr_1.5fr_1.5fr_1fr_1fr_1fr_auto] gap-2 px-3 py-2 text-sm">
                                            <div className="truncate font-medium whitespace-nowrap">
                                                {p.workerName}
                                            </div>
                                            <div>
                                                <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800 dark:bg-slate-500/20 dark:text-slate-300">
                                                    {p.status}
                                                </span>
                                            </div>
                                            <div className="truncate whitespace-nowrap">
                                                <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-500/20 dark:text-blue-300">
                                                    {p.employmentType}
                                                </span>
                                            </div>
                                            <div className="truncate whitespace-nowrap">
                                                <span className="inline-flex rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800 dark:bg-teal-500/20 dark:text-teal-300">
                                                    {p.employmentArrangement}
                                                </span>
                                            </div>
                                            <div className="tabular-nums whitespace-nowrap">
                                                {formatDate(p.periodStart)}
                                            </div>
                                            <div className="tabular-nums whitespace-nowrap">
                                                {formatDate(p.periodEnd)}
                                            </div>
                                            <div className="tabular-nums whitespace-nowrap">
                                                {formatDate(p.payrollDate)}
                                            </div>
                                            <div className="flex justify-end">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            className="h-8 w-8 p-0"
                                                            aria-label="Payroll actions">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem asChild>
                                                            <Link
                                                                href={`/dashboard/payroll/${p.id}/breakdown`}>
                                                                View
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem asChild>
                                                            <Link
                                                                href={`/dashboard/payroll/${p.id}/breakdown`}>
                                                                Edit
                                                            </Link>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
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
                        disabled={pending || downloadingZip || loadingDrafts || draftCount === 0}
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
