"use client";

import * as React from "react";
import * as XLSX from "xlsx";

import { importTimesheetEntries } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";

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

export default function TimesheetImportPage() {
    const [isDragging, setIsDragging] = React.useState(false);
    const [file, setFile] = React.useState<File | null>(null);
    const [parsedData, setParsedData] = React.useState<Record<string, unknown>[] | null>(null);
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
            const workbook = XLSX.read(data, { type: "array" });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(firstSheet) as Record<string, unknown>[];
            setParsedData(json);
            setFile(file);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to parse Excel file");
            setParsedData(null);
            setFile(null);
        }
    }, []);

    const handleSubmit = React.useCallback(async () => {
        if (!parsedData || parsedData.length === 0) return;
        setError(null);
        setSubmitResult(null);
        setPending(true);
        try {
            const result = await importTimesheetEntries(parsedData);
            setSubmitResult(result);
            if (result.imported && result.imported > 0) {
                setFile(null);
                setParsedData(null);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Import failed");
        } finally {
            setPending(false);
        }
    }, [parsedData]);

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
        [handleParse]
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
        [handleParse]
    );

    const reset = React.useCallback(() => {
        setFile(null);
        setParsedData(null);
        setError(null);
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Import timesheet</h1>
                <p className="text-muted-foreground">
                    Upload an Excel or CSV file to import timesheet data
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Import Status
                        </CardTitle>
                        <Upload className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {parsedData ? parsedData.length : "—"}
                        </div>
                        <p className="text-muted-foreground text-xs">
                            {parsedData
                                ? "Rows in current file"
                                : "Drop or select a file below to import"}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Supported Formats
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-xs">
                            Excel (.xlsx, .xls) and CSV files
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Import timesheet</CardTitle>
                    <CardDescription>
                        Drop your Excel (.xlsx, .xls) or CSV file here, or click to browse
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
                        `}
                    >
                        <input
                            type="file"
                            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                            onChange={onFileInputChange}
                            className="sr-only"
                        />
                        <Upload className="text-muted-foreground size-10" />
                        <span className="text-muted-foreground text-sm">
                            {isDragging ? "Drop file here" : "Drag and drop or click to upload"}
                        </span>
                        <span className="text-muted-foreground text-xs">
                            .xlsx, .xls, .csv
                        </span>
                    </label>

                    {error && (
                        <p className="text-destructive mt-3 text-sm">{error}</p>
                    )}

                    {file && parsedData && (
                        <div className="mt-4 space-y-2 rounded-lg border bg-muted/30 p-4">
                            <p className="font-medium">{file.name}</p>
                            <p className="text-muted-foreground text-sm">
                                {parsedData.length} row{parsedData.length !== 1 ? "s" : ""} parsed.
                                Expected columns: worker_name or name, date, time_in, time_out (or timeIn, timeOut).
                            </p>
                            <button
                                type="button"
                                onClick={reset}
                                className="text-primary hover:underline mr-4 text-sm"
                            >
                                Upload a different file
                            </button>
                        </div>
                    )}
                    {submitResult && (
                        <div className="mt-4 rounded-lg border p-4">
                            {submitResult.imported != null && submitResult.imported > 0 && (
                                <p className="text-emerald-600 dark:text-emerald-400">
                                    Imported {submitResult.imported} entries.
                                </p>
                            )}
                            {submitResult.errors && submitResult.errors.length > 0 && (
                                <ul className="mt-2 list-inside list-disc text-sm text-amber-600 dark:text-amber-400">
                                    {submitResult.errors.slice(0, 5).map((e, i) => (
                                        <li key={i}>{e}</li>
                                    ))}
                                    {submitResult.errors.length > 5 && (
                                        <li>…and {submitResult.errors.length - 5} more</li>
                                    )}
                                </ul>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button
                    disabled={!parsedData || parsedData.length === 0 || pending}
                    onClick={handleSubmit}
                >
                    {pending ? "Importing..." : "Import to database"}
                </Button>
            </div>
        </div>
    );
}
