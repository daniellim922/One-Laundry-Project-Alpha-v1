"use client";

import * as React from "react";
import * as XLSX from "xlsx";

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

export default function TimesheetPage() {
    const [isDragging, setIsDragging] = React.useState(false);
    const [file, setFile] = React.useState<File | null>(null);
    const [parsedData, setParsedData] = React.useState<unknown[] | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    const handleParse = React.useCallback(async (file: File) => {
        setError(null);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: "array" });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(firstSheet);
            setParsedData(json);
            setFile(file);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to parse Excel file");
            setParsedData(null);
            setFile(null);
        }
    }, []);

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
                <h1 className="text-2xl font-semibold tracking-tight">Timesheet</h1>
                <p className="text-muted-foreground">
                    Upload an Excel or CSV file to import timesheet data
                </p>
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
                        <div className="mt-4 rounded-lg border bg-muted/30 p-4">
                            <p className="font-medium">{file.name}</p>
                            <p className="text-muted-foreground text-sm">
                                {parsedData.length} row{parsedData.length !== 1 ? "s" : ""} imported
                            </p>
                            <button
                                type="button"
                                onClick={reset}
                                className="text-primary hover:underline mt-2 text-sm"
                            >
                                Upload a different file
                            </button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button disabled={!parsedData || parsedData.length === 0}>
                    Submit
                </Button>
            </div>
        </div>
    );
}
