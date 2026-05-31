"use client";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { FormPageLayout } from "@/components/form-page-layout";
import { hasRowError } from "@/services/timesheet/import-preview";

import { ImportFileDropzone } from "./_components/import-file-dropzone";
import { ImportParsedFileSummary } from "./_components/import-parsed-file-summary";
import { ImportPreviewTable } from "./_components/import-preview-table";
import { ImportSubmitResult } from "./_components/import-submit-result";
import { OverlapConfirmationPanel } from "./_components/overlap-confirmation-panel";
import { UnresolvedWorkerMatchingPanel } from "./_components/unresolved-worker-matching-panel";
import type { TimesheetImportWorker } from "./worker-matching";
import { useTimesheetImport } from "./use-timesheet-import";

export function TimesheetImportClient({
    workers,
}: {
    workers: TimesheetImportWorker[];
}) {
    const {
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
    } = useTimesheetImport(workers);

    const totalEntries = editableRows.length;
    const hasUnresolvedWorkerMatches =
        workerMatchResult.unresolvedNames.length > 0;

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
                    <ImportFileDropzone
                        isDragging={isDragging}
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onFileInputChange={onFileInputChange}
                    />

                    {error && (
                        <p className="text-destructive mt-3 text-sm">{error}</p>
                    )}

                    {file && parsedData && (
                        <div className="mt-4 space-y-4">
                            <ImportParsedFileSummary
                                fileName={file.name}
                                parsedData={parsedData}
                                totalEntries={totalEntries}
                                onReset={reset}
                            />
                            <UnresolvedWorkerMatchingPanel
                                unresolvedNames={
                                    workerMatchResult.unresolvedNames
                                }
                            />
                            {overlapResult != null && (
                                <OverlapConfirmationPanel
                                    overlaps={overlapResult}
                                    pending={pending}
                                    onSkipDuplicates={() => {
                                        void handleSubmit("skip");
                                    }}
                                    onImportAll={() => {
                                        void handleSubmit("force");
                                    }}
                                />
                            )}
                            <ImportPreviewTable
                                editableRows={editableRows}
                                onEditableRowsChange={setEditableRows}
                                workerMatchGroupsByImportedName={
                                    workerMatchGroupsByImportedName
                                }
                                activeWorkers={activeWorkers}
                                onManualWorkerMatch={setManualWorkerMatch}
                                onAddRowForWorker={addRowForWorker}
                                onUpdateRow={updateEditableRow}
                            />
                        </div>
                    )}

                    {submitResult && (
                        <ImportSubmitResult submitResult={submitResult} />
                    )}

                    <div className="mt-4 flex justify-end">
                        <Button
                            disabled={
                                !parsedData ||
                                totalEntries === 0 ||
                                pending ||
                                hasUnresolvedWorkerMatches ||
                                editableRows.some(hasRowError) ||
                                overlapResult != null
                            }
                            onClick={() => {
                                void handleSubmit();
                            }}>
                            {pending ? "Importing..." : "Upload Timesheet"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </FormPageLayout>
    );
}
