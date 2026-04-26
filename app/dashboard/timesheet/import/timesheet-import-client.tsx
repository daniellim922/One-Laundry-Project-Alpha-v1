"use client";

import * as React from "react";
import * as XLSX from "xlsx";

import { importAttendRecordTimesheet } from "./import-attend-record-timesheet";
import { SelectSearch } from "@/components/ui/SelectSearch";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { FormPageLayout } from "@/components/form-page-layout";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Trash2, Upload } from "lucide-react";
import { parseAttendRecord } from "@/utils/payroll/parse-attendrecord";
import type { AttendRecordOutput } from "@/utils/payroll/parse-attendrecord";
import {
    resolveTimesheetImportWorkerMatches,
    type TimesheetImportWorker,
} from "./worker-matching";

const ACCEPTED_TYPES = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
];

const ACCEPTED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

function isValidFile(file: File): boolean {
    return (
        ACCEPTED_TYPES.includes(file.type) ||
        ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
    );
}

type FlatRow = {
    workerName: string;
    dateIn: string;
    dateOut: string;
    timeIn: string;
    timeOut: string;
};

function hasMissingData(row: FlatRow): boolean {
    return (
        parseDate(row.dateIn) == null ||
        parseDate(row.dateOut) == null ||
        parseTime(row.timeIn) == null ||
        parseTime(row.timeOut) == null
    );
}

/** True if row has invalid inputs or hours calculate to 0h (bad dates/times or end before start). */
function hasRowError(row: FlatRow): boolean {
    if (hasMissingData(row)) return true;
    const hours = calcWorkingHours(
        row.dateIn,
        row.timeIn,
        row.dateOut,
        row.timeOut,
    );
    return hours === "0h";
}

function flattenForPreview(data: AttendRecordOutput): FlatRow[] {
    const rows: FlatRow[] = [];
    for (const worker of data.workers) {
        for (const d of worker.dates) {
            rows.push({
                workerName: worker.name,
                dateIn: d.dateIn,
                dateOut: d.dateOut,
                timeIn: d.timeIn,
                timeOut: d.timeOut.trim() || "",
            });
        }
    }
    return rows;
}

/** Enforce HH:MM format as user types - digits only, auto-insert colon */
function formatTimeInput(raw: string): string {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

/** Parse "DD/MM/YYYY" to Date. Returns null if invalid. */
function parseDate(dateStr: string): Date | null {
    const m = String(dateStr)
        .trim()
        .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    const day = parseInt(m[1]!, 10);
    const month = parseInt(m[2]!, 10) - 1;
    const year = parseInt(m[3]!, 10);
    const d = new Date(year, month, day);
    if (
        d.getFullYear() !== year ||
        d.getMonth() !== month ||
        d.getDate() !== day
    )
        return null;
    return d;
}

/** Parse "HH:MM" to { h, m }. Returns null if invalid. */
function parseTime(time: string): { h: number; m: number } | null {
    const trimmed = time.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const h = parseInt(match[1]!, 10);
    const m = parseInt(match[2]!, 10);
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return { h, m };
}

/** Calculate working hours from dateIn+timeIn to dateOut+timeOut. Uses same validation as hasMissingData (parseDate/parseTime). Returns "Xh Ym" or "0h" when invalid. */
function calcWorkingHours(
    dateIn: string,
    timeIn: string,
    dateOut: string,
    timeOut: string,
): string {
    const dIn = parseDate(dateIn);
    const dOut = parseDate(dateOut);
    const tIn = parseTime(timeIn);
    const tOut = parseTime(timeOut);
    if (!dIn || !dOut || !tIn || !tOut) return "0h";
    const start = new Date(
        dIn.getFullYear(),
        dIn.getMonth(),
        dIn.getDate(),
        tIn.h,
        tIn.m,
    );
    const end = new Date(
        dOut.getFullYear(),
        dOut.getMonth(),
        dOut.getDate(),
        tOut.h,
        tOut.m,
    );
    const diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) return "0h";
    const totalMinutes = Math.floor(diffMs / (60 * 1000));
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
}

/** Enforce DD/MM/YYYY format as user types - digits only, auto-insert slashes */
function formatDateInput(raw: string): string {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function placeCaretAtEnd(el: HTMLElement) {
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
}

/** Group rows by worker name for display, preserving flat index for updates */
function groupRowsByWorker(
    rows: FlatRow[],
): { row: FlatRow; flatIndex: number; isFirstInGroup: boolean }[] {
    const groups = new Map<string, { row: FlatRow; index: number }[]>();
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!;
        const list = groups.get(row.workerName) ?? [];
        list.push({ row, index: i });
        groups.set(row.workerName, list);
    }
    const workerOrder: string[] = [];
    for (const row of rows) {
        if (!workerOrder.includes(row.workerName)) {
            workerOrder.push(row.workerName);
        }
    }
    const result: {
        row: FlatRow;
        flatIndex: number;
        isFirstInGroup: boolean;
    }[] = [];
    for (const name of workerOrder) {
        const list = groups.get(name) ?? [];
        for (let j = 0; j < list.length; j++) {
            result.push({
                row: list[j]!.row,
                flatIndex: list[j]!.index,
                isFirstInGroup: j === 0,
            });
        }
    }
    return result;
}

function editableRowsToAttendRecord(
    editableRows: FlatRow[],
    meta: {
        attendanceDate: AttendRecordOutput["attendanceDate"];
        tablingDate: string;
    },
): AttendRecordOutput {
    const workersMap = new Map<string, FlatRow[]>();
    for (const row of editableRows) {
        const list = workersMap.get(row.workerName) ?? [];
        list.push(row);
        workersMap.set(row.workerName, list);
    }
    const workers = Array.from(workersMap.entries()).map(([name, rows]) => ({
        userId: "",
        name,
        dates: rows.map((r) => ({
            dateIn: r.dateIn,
            timeIn: r.timeIn,
            dateOut: r.dateOut,
            timeOut: r.timeOut || "     ",
        })),
    }));
    return {
        attendanceDate: meta.attendanceDate,
        tablingDate: meta.tablingDate,
        workers,
    };
}

export function TimesheetImportClient({
    workers,
}: {
    workers: TimesheetImportWorker[];
}) {
    const [isDragging, setIsDragging] = React.useState(false);
    const [file, setFile] = React.useState<File | null>(null);
    const [parsedData, setParsedData] =
        React.useState<AttendRecordOutput | null>(null);
    const [editableRows, setEditableRows] = React.useState<FlatRow[]>([]);
    const [error, setError] = React.useState<string | null>(null);
    const [submitResult, setSubmitResult] = React.useState<{
        imported?: number;
        errors?: string[];
    } | null>(null);
    const [pending, setPending] = React.useState(false);

    const handleParse = React.useCallback(async (file: File) => {
        setError(null);
        setSubmitResult(null);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, {
                type: "array",
                cellDates: true,
            });
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) {
                setError("Workbook has no sheets.");
                setParsedData(null);
                setFile(null);
                return;
            }
            const ws = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(ws, {
                header: 1,
                defval: null,
                raw: false,
            }) as (string | number | null)[][];

            const result = parseAttendRecord(rows);
            if (!result.workers.length) {
                setError(
                    "Unrecognized format — expected AttendRecord-style Excel",
                );
                setParsedData(null);
                setFile(null);
                return;
            }
            setParsedData(result);
            setEditableRows(flattenForPreview(result));
            setFile(file);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to parse Excel file",
            );
            setParsedData(null);
            setFile(null);
        }
    }, []);

    const updateEditableRow = React.useCallback(
        (
            rowIndex: number,
            field: "workerName" | "dateIn" | "dateOut" | "timeIn" | "timeOut",
            value: string,
        ) => {
            setEditableRows((prev) => {
                const next = [...prev];
                const row = { ...next[rowIndex]! };
                row[field] = value;
                next[rowIndex] = row;
                return next;
            });
        },
        [],
    );

    const updateWorkerNameForGroup = React.useCallback(
        (groupWorkerName: string, nextWorkerName: string) => {
            setEditableRows((prev) =>
                prev.map((r) =>
                    r.workerName === groupWorkerName
                        ? { ...r, workerName: nextWorkerName }
                        : r,
                ),
            );
        },
        [],
    );

    const handleSubmit = React.useCallback(async () => {
        if (!parsedData || editableRows.length === 0) return;
        setError(null);
        setSubmitResult(null);
        setPending(true);
        try {
            const dataToImport = editableRowsToAttendRecord(editableRows, {
                attendanceDate: parsedData.attendanceDate,
                tablingDate: parsedData.tablingDate,
            });
            const result = await importAttendRecordTimesheet(dataToImport);
            if ("error" in result) {
                setError(result.error);
                return;
            }
            setSubmitResult(result);
            if (result.imported && result.imported > 0) {
                setFile(null);
                setParsedData(null);
                setEditableRows([]);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Import failed");
        } finally {
            setPending(false);
        }
    }, [parsedData, editableRows]);

    const onDrop = React.useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            const dropped = e.dataTransfer.files[0];
            if (dropped && isValidFile(dropped)) {
                handleParse(dropped);
            } else {
                setError("Please drop an Excel file (.xlsx, .xls) or CSV");
            }
        },
        [handleParse],
    );

    const onDragOver = React.useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const onDragLeave = React.useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const onFileInputChange = React.useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const selected = e.target.files?.[0];
            if (selected && isValidFile(selected)) {
                handleParse(selected);
            }
            e.target.value = "";
        },
        [handleParse],
    );

    const reset = React.useCallback(() => {
        setFile(null);
        setParsedData(null);
        setEditableRows([]);
        setError(null);
        setSubmitResult(null);
    }, []);

    const totalEntries = editableRows.length;
    const workerMatchResult = React.useMemo(
        () =>
            resolveTimesheetImportWorkerMatches({
                rows: editableRows,
                workers,
            }),
        [editableRows, workers],
    );
    const hasUnresolvedWorkerMatches =
        workerMatchResult.unresolvedNames.length > 0;
    const activeWorkers = React.useMemo(
        () => workers.filter((worker) => worker.status === "Active"),
        [workers],
    );

    /** Resolve workerName to worker id for SelectSearch value (match by name, case-insensitive) */
    const workerIdForName = React.useCallback(
        (workerName: string) =>
            activeWorkers.find(
                (w) =>
                    w.name.toLowerCase().trim() ===
                    workerName.toLowerCase().trim(),
            )?.id ?? "",
        [activeWorkers],
    );

    return (
        <FormPageLayout
            title="Import timesheet"
            subtitle="Upload an AttendRecord-style Excel file to import timesheet data">
            <Card>
                <CardHeader>
                    <CardTitle>Import timesheet</CardTitle>
                    <CardDescription>
                        Drop your AttendRecord Excel file here, or click to
                        browse
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <label
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        className={`
                            flex min-h-[200px] cursor-pointer flex-col items-center justify-center
                            gap-3 rounded-lg border-2 border-dashed transition-colors
                            hover:border-primary/50 hover:bg-muted/50
                            ${isDragging ? "border-primary bg-muted/50" : "border-muted-foreground/25"}
                        `}>
                        <input
                            type="file"
                            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                            onChange={onFileInputChange}
                            className="sr-only"
                        />
                        <Upload className="text-muted-foreground size-10" />
                        <span className="text-muted-foreground text-sm">
                            {isDragging
                                ? "Drop file here"
                                : "Drag and drop or click to upload"}
                        </span>
                        <span className="text-muted-foreground text-xs">
                            .xlsx, .xls
                        </span>
                    </label>

                    {error && (
                        <p className="text-destructive mt-3 text-sm">{error}</p>
                    )}

                    {file && parsedData && (
                        <div className="mt-4 space-y-4">
                            <div className="flex flex-wrap items-center gap-4">
                                <p className="font-medium">{file.name}</p>
                                <button
                                    type="button"
                                    onClick={reset}
                                    className="text-primary hover:underline text-sm">
                                    Upload a different file
                                </button>
                            </div>
                            <div className="text-muted-foreground text-sm">
                                <p>
                                    Attendance period:{" "}
                                    {parsedData.attendanceDate.startDate} ~{" "}
                                    {parsedData.attendanceDate.endDate}
                                </p>
                                {parsedData.tablingDate && (
                                    <p>
                                        Tabling date: {parsedData.tablingDate}
                                    </p>
                                )}
                                <p>
                                    {parsedData.workers.length} worker
                                    {parsedData.workers.length !== 1 ? "s" : ""}
                                    , {totalEntries} entr
                                    {totalEntries !== 1 ? "ies" : "y"} total
                                </p>
                            </div>
                            {hasUnresolvedWorkerMatches && (
                                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                                    <p className="font-medium">
                                        Unresolved worker matches
                                    </p>
                                    <p className="mt-1">
                                        {
                                            workerMatchResult.unresolvedNames
                                                .length
                                        }{" "}
                                        worker{" "}
                                        {workerMatchResult.unresolvedNames
                                            .length !== 1
                                            ? "names"
                                            : "name"}{" "}
                                        must match an active Worker before
                                        upload.
                                    </p>
                                    <ul className="mt-2 list-inside list-disc">
                                        {workerMatchResult.unresolvedNames.map(
                                            (workerName) => (
                                                <li key={workerName}>
                                                    {workerName}
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                </div>
                            )}
                            <div className="rounded-md border overflow-x-auto max-h-[70vh] overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Worker</TableHead>
                                            <TableHead>Date in</TableHead>
                                            <TableHead>Time in</TableHead>
                                            <TableHead>Date out</TableHead>
                                            <TableHead>Time out</TableHead>
                                            <TableHead>Hours</TableHead>
                                            <TableHead className="w-10" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {groupRowsByWorker(editableRows).map(
                                            (
                                                {
                                                    row,
                                                    flatIndex: i,
                                                    isFirstInGroup,
                                                },
                                                idx,
                                            ) => (
                                                <TableRow
                                                    key={i}
                                                    className={
                                                        [
                                                            hasRowError(row) &&
                                                                "bg-destructive/10 hover:bg-destructive/25",
                                                            isFirstInGroup &&
                                                                idx > 0 &&
                                                                "border-t-2 border-muted-foreground/20",
                                                        ]
                                                            .filter(Boolean)
                                                            .join(" ") ||
                                                        undefined
                                                    }>
                                                    <TableCell
                                                        className={cn(
                                                            "p-1 min-w-[180px]",
                                                            !isFirstInGroup &&
                                                                "pl-8",
                                                        )}>
                                                        {isFirstInGroup ? (
                                                            <SelectSearch
                                                                options={activeWorkers.map(
                                                                    (w) => ({
                                                                        value: w.id,
                                                                        label: w.name,
                                                                    }),
                                                                )}
                                                                value={workerIdForName(
                                                                    row.workerName,
                                                                )}
                                                                onChange={(
                                                                    _id,
                                                                    name,
                                                                ) =>
                                                                    updateWorkerNameForGroup(
                                                                        row.workerName,
                                                                        name,
                                                                    )
                                                                }
                                                                name={`worker-${i}`}
                                                                placeholder={
                                                                    row.workerName ||
                                                                    "Select worker"
                                                                }
                                                                searchPlaceholder="Search workers…"
                                                                emptyText="No workers found."
                                                            />
                                                        ) : (
                                                            <span className="text-muted-foreground/50">
                                                                └
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="p-1">
                                                        <div
                                                            contentEditable
                                                            suppressContentEditableWarning
                                                            onInput={(e) => {
                                                                const el =
                                                                    e.currentTarget;
                                                                const formatted =
                                                                    formatDateInput(
                                                                        el.textContent ??
                                                                            "",
                                                                    );
                                                                if (
                                                                    el.textContent !==
                                                                    formatted
                                                                ) {
                                                                    el.textContent =
                                                                        formatted;
                                                                    placeCaretAtEnd(
                                                                        el,
                                                                    );
                                                                }
                                                            }}
                                                            onBlur={(e) =>
                                                                updateEditableRow(
                                                                    i,
                                                                    "dateIn",
                                                                    e
                                                                        .currentTarget
                                                                        .textContent ??
                                                                        "",
                                                                )
                                                            }
                                                            onPaste={(e) => {
                                                                e.preventDefault();
                                                                const text =
                                                                    e.clipboardData.getData(
                                                                        "text/plain",
                                                                    );
                                                                const formatted =
                                                                    formatDateInput(
                                                                        text.replace(
                                                                            /\D/g,
                                                                            "",
                                                                        ),
                                                                    );
                                                                document.execCommand(
                                                                    "insertText",
                                                                    false,
                                                                    formatted,
                                                                );
                                                            }}
                                                            className={`min-w-28 rounded px-2 py-1.5 outline-none focus:ring-2 focus:ring-ring focus:ring-inset ${parseDate(row.dateIn) == null ? "text-destructive" : ""}`}>
                                                            {row.dateIn}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="p-1">
                                                        <div
                                                            contentEditable
                                                            suppressContentEditableWarning
                                                            onInput={(e) => {
                                                                const el =
                                                                    e.currentTarget;
                                                                const formatted =
                                                                    formatTimeInput(
                                                                        el.textContent ??
                                                                            "",
                                                                    );
                                                                if (
                                                                    el.textContent !==
                                                                    formatted
                                                                ) {
                                                                    el.textContent =
                                                                        formatted;
                                                                    placeCaretAtEnd(
                                                                        el,
                                                                    );
                                                                }
                                                            }}
                                                            onBlur={(e) =>
                                                                updateEditableRow(
                                                                    i,
                                                                    "timeIn",
                                                                    e
                                                                        .currentTarget
                                                                        .textContent ??
                                                                        "",
                                                                )
                                                            }
                                                            onPaste={(e) => {
                                                                e.preventDefault();
                                                                const text =
                                                                    e.clipboardData.getData(
                                                                        "text/plain",
                                                                    );
                                                                const formatted =
                                                                    formatTimeInput(
                                                                        text.replace(
                                                                            /\D/g,
                                                                            "",
                                                                        ),
                                                                    );
                                                                document.execCommand(
                                                                    "insertText",
                                                                    false,
                                                                    formatted,
                                                                );
                                                            }}
                                                            className={`min-w-20 rounded px-2 py-1.5 outline-none focus:ring-2 focus:ring-ring focus:ring-inset ${parseTime(row.timeIn) == null ? "text-destructive" : ""}`}>
                                                            {row.timeIn}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="p-1">
                                                        <div
                                                            contentEditable
                                                            suppressContentEditableWarning
                                                            onInput={(e) => {
                                                                const el =
                                                                    e.currentTarget;
                                                                const formatted =
                                                                    formatDateInput(
                                                                        el.textContent ??
                                                                            "",
                                                                    );
                                                                if (
                                                                    el.textContent !==
                                                                    formatted
                                                                ) {
                                                                    el.textContent =
                                                                        formatted;
                                                                    placeCaretAtEnd(
                                                                        el,
                                                                    );
                                                                }
                                                            }}
                                                            onBlur={(e) =>
                                                                updateEditableRow(
                                                                    i,
                                                                    "dateOut",
                                                                    e
                                                                        .currentTarget
                                                                        .textContent ??
                                                                        "",
                                                                )
                                                            }
                                                            onPaste={(e) => {
                                                                e.preventDefault();
                                                                const text =
                                                                    e.clipboardData.getData(
                                                                        "text/plain",
                                                                    );
                                                                const formatted =
                                                                    formatDateInput(
                                                                        text.replace(
                                                                            /\D/g,
                                                                            "",
                                                                        ),
                                                                    );
                                                                document.execCommand(
                                                                    "insertText",
                                                                    false,
                                                                    formatted,
                                                                );
                                                            }}
                                                            className={`min-w-28 rounded px-2 py-1.5 outline-none focus:ring-2 focus:ring-ring focus:ring-inset ${parseDate(row.dateOut) == null ? "text-destructive" : ""}`}>
                                                            {row.dateOut}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="p-1">
                                                        <div
                                                            contentEditable
                                                            suppressContentEditableWarning
                                                            onInput={(e) => {
                                                                const el =
                                                                    e.currentTarget;
                                                                const raw = (
                                                                    el.textContent ??
                                                                    ""
                                                                ).replace(
                                                                    /—/g,
                                                                    "",
                                                                );
                                                                const formatted =
                                                                    raw === ""
                                                                        ? ""
                                                                        : formatTimeInput(
                                                                              raw,
                                                                          );
                                                                if (
                                                                    el.textContent !==
                                                                    formatted
                                                                ) {
                                                                    el.textContent =
                                                                        formatted ||
                                                                        "—";
                                                                    if (
                                                                        formatted
                                                                    )
                                                                        placeCaretAtEnd(
                                                                            el,
                                                                        );
                                                                }
                                                            }}
                                                            onBlur={(e) => {
                                                                const v = (
                                                                    e
                                                                        .currentTarget
                                                                        .textContent ??
                                                                    ""
                                                                ).trim();
                                                                updateEditableRow(
                                                                    i,
                                                                    "timeOut",
                                                                    v === "—"
                                                                        ? ""
                                                                        : v,
                                                                );
                                                            }}
                                                            onPaste={(e) => {
                                                                e.preventDefault();
                                                                const text =
                                                                    e.clipboardData.getData(
                                                                        "text/plain",
                                                                    );
                                                                const formatted =
                                                                    formatTimeInput(
                                                                        text.replace(
                                                                            /\D/g,
                                                                            "",
                                                                        ),
                                                                    );
                                                                document.execCommand(
                                                                    "insertText",
                                                                    false,
                                                                    formatted,
                                                                );
                                                            }}
                                                            className={`min-w-20 rounded px-2 py-1.5 outline-none focus:ring-2 focus:ring-ring focus:ring-inset ${parseTime(row.timeOut) == null ? "text-destructive" : ""}`}>
                                                            {row.timeOut || "—"}
                                                        </div>
                                                    </TableCell>
                                                    {(() => {
                                                        const hours =
                                                            calcWorkingHours(
                                                                row.dateIn,
                                                                row.timeIn,
                                                                row.dateOut,
                                                                row.timeOut,
                                                            );
                                                        return (
                                                            <TableCell
                                                                className={`p-1 tabular-nums ${hours === "0h" ? "text-destructive" : "text-muted-foreground"}`}>
                                                                {hours}
                                                            </TableCell>
                                                        );
                                                    })()}
                                                    <TableCell className="w-10 p-1">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setEditableRows(
                                                                    (prev) =>
                                                                        prev.filter(
                                                                            (
                                                                                _,
                                                                                idx,
                                                                            ) =>
                                                                                idx !==
                                                                                i,
                                                                        ),
                                                                )
                                                            }
                                                            className="text-muted-foreground hover:text-destructive rounded p-1"
                                                            aria-label="Delete entry">
                                                            <Trash2 className="size-4" />
                                                        </button>
                                                    </TableCell>
                                                </TableRow>
                                            ),
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                    {submitResult && (
                        <div className="mt-4 rounded-lg border p-4">
                            {submitResult.imported != null &&
                                submitResult.imported > 0 && (
                                    <p className="text-emerald-600 dark:text-emerald-400">
                                        Imported {submitResult.imported}{" "}
                                        entries.
                                    </p>
                                )}
                            {submitResult.errors &&
                                submitResult.errors.length > 0 && (
                                    <ul className="mt-2 list-inside list-disc text-sm text-amber-600 dark:text-amber-400">
                                        {submitResult.errors
                                            .slice(0, 5)
                                            .map((e, i) => (
                                                <li key={i}>{e}</li>
                                            ))}
                                        {submitResult.errors.length > 5 && (
                                            <li>
                                                …and{" "}
                                                {submitResult.errors.length - 5}{" "}
                                                more
                                            </li>
                                        )}
                                    </ul>
                                )}
                        </div>
                    )}

                    <div className="mt-4 flex justify-end">
                        <Button
                            disabled={
                                !parsedData ||
                                totalEntries === 0 ||
                                pending ||
                                hasUnresolvedWorkerMatches ||
                                editableRows.some(hasRowError)
                            }
                            onClick={handleSubmit}>
                            {pending ? "Importing..." : "Upload Timesheet"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </FormPageLayout>
    );
}
