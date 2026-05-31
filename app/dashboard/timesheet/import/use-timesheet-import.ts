import * as React from "react";
import * as XLSX from "@e965/xlsx";

import type { OverlapEntry } from "@/services/timesheet/import-attend-record-timesheet";
import {
    editableRowsToAttendRecord,
    flattenForPreview,
    type TimesheetImportPreviewRow,
} from "@/services/timesheet/import-preview";
import { parseAttendRecord } from "@/utils/payroll/parse-attendrecord";
import type { AttendRecordOutput } from "@/utils/payroll/parse-attendrecord";

import { importAttendRecordTimesheet } from "./import-attend-record-timesheet";
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

export function useTimesheetImport(workers: TimesheetImportWorker[]) {
    const [isDragging, setIsDragging] = React.useState(false);
    const [file, setFile] = React.useState<File | null>(null);
    const [parsedData, setParsedData] =
        React.useState<AttendRecordOutput | null>(null);
    const [editableRows, setEditableRows] = React.useState<
        TimesheetImportPreviewRow[]
    >([]);
    const [error, setError] = React.useState<string | null>(null);
    const [submitResult, setSubmitResult] = React.useState<{
        imported?: number;
        skipped?: number;
        errors?: string[];
    } | null>(null);
    const [overlapResult, setOverlapResult] = React.useState<
        OverlapEntry[] | null
    >(null);
    const [pending, setPending] = React.useState(false);
    const [manualWorkerMatches, setManualWorkerMatches] = React.useState<
        Record<string, string>
    >({});

    const handleParse = React.useCallback(
        async (file: File) => {
            setError(null);
            setSubmitResult(null);
            setOverlapResult(null);
            setManualWorkerMatches({});
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
        },
        [workers],
    );

    React.useEffect(() => {
        if (!parsedData) return;
        setEditableRows(flattenForPreview(parsedData, workers, {}));
    }, [parsedData, workers]);

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

    const addRowForWorker = React.useCallback((workerName: string) => {
        setEditableRows((prev) => {
            const firstIdx = prev.findIndex((r) => r.workerName === workerName);
            if (firstIdx === -1) return prev;
            const newRow: TimesheetImportPreviewRow = {
                workerName,
                dateIn: "",
                dateOut: "",
                timeIn: "",
                timeOut: "",
            };
            const next = [...prev];
            next.splice(firstIdx + 1, 0, newRow);
            return next;
        });
    }, []);

    const handleSubmit = React.useCallback(
        async (mode?: "skip" | "force") => {
            if (!parsedData || editableRows.length === 0) return;
            setError(null);
            if (mode == null) {
                setSubmitResult(null);
            }
            setPending(true);
            try {
                const workerMatchResult = resolveTimesheetImportWorkerMatches({
                    rows: editableRows,
                    workers,
                    manualMatchesByImportedName: manualWorkerMatches,
                });
                const resolvedWorkerNamesByImportedName = new Map(
                    workerMatchResult.groups
                        .filter((group) => group.resolvedWorker != null)
                        .map((group) => [
                            group.importedName,
                            group.resolvedWorker!.name,
                        ]),
                );
                const dataToImport = editableRowsToAttendRecord(
                    editableRows,
                    {
                        attendanceDate: parsedData.attendanceDate,
                        tablingDate: parsedData.tablingDate,
                    },
                    resolvedWorkerNamesByImportedName,
                );
                const result = await importAttendRecordTimesheet(
                    dataToImport,
                    mode,
                );
                if ("error" in result) {
                    setError(result.error);
                    return;
                }
                if (result.status === "confirmation_required") {
                    setOverlapResult(result.overlaps);
                    return;
                }
                setOverlapResult(null);
                setSubmitResult({
                    imported: result.imported,
                    skipped: result.skipped,
                    errors: result.errors,
                });
                if (result.imported > 0) {
                    setFile(null);
                    setParsedData(null);
                    setEditableRows([]);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Import failed");
            } finally {
                setPending(false);
            }
        },
        [parsedData, editableRows, workers, manualWorkerMatches],
    );

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
        setOverlapResult(null);
        setManualWorkerMatches({});
    }, []);

    const workerMatchResult = React.useMemo(
        () =>
            resolveTimesheetImportWorkerMatches({
                rows: editableRows,
                workers,
                manualMatchesByImportedName: manualWorkerMatches,
            }),
        [editableRows, workers, manualWorkerMatches],
    );
    const workerMatchGroupsByImportedName = React.useMemo(
        () =>
            new Map(
                workerMatchResult.groups.map((group) => [
                    group.importedName,
                    group,
                ]),
            ),
        [workerMatchResult.groups],
    );
    const activeWorkers = React.useMemo(
        () => workers.filter((worker) => worker.status === "Active"),
        [workers],
    );

    const setManualWorkerMatch = React.useCallback(
        (importedName: string, workerId: string) => {
            setManualWorkerMatches((prev) => ({
                ...prev,
                [importedName]: workerId,
            }));
        },
        [],
    );

    return {
        isDragging,
        file,
        parsedData,
        editableRows,
        setEditableRows,
        error,
        submitResult,
        overlapResult,
        pending,
        onDrop,
        onDragOver,
        onDragLeave,
        onFileInputChange,
        reset,
        updateEditableRow,
        addRowForWorker,
        handleSubmit,
        workerMatchResult,
        workerMatchGroupsByImportedName,
        activeWorkers,
        setManualWorkerMatch,
    };
}
