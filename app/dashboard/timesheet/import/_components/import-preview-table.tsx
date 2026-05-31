import * as React from "react";
import { Trash2 } from "lucide-react";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
    groupRowsByWorker,
    hasRowError,
    isPreviewDateInvalid,
    isPreviewTimeInInvalid,
    isPreviewTimeOutInvalid,
    type TimesheetImportPreviewRow,
} from "@/services/timesheet/import-preview";
import { formatClockIntervalHm } from "@/utils/payroll/payroll-utils";
import type { TimesheetImportWorkerMatchGroup } from "../worker-matching";
import type { TimesheetImportWorker } from "../worker-matching";

import { ContentEditableDateCell } from "./content-editable-date-cell";
import { ContentEditableTimeCell } from "./content-editable-time-cell";
import { ImportPreviewWorkerCell } from "./import-preview-worker-cell";

export function ImportPreviewTable({
    editableRows,
    onEditableRowsChange,
    workerMatchGroupsByImportedName,
    activeWorkers,
    onManualWorkerMatch,
    onAddRowForWorker,
    onUpdateRow,
}: {
    editableRows: TimesheetImportPreviewRow[];
    onEditableRowsChange: React.Dispatch<
        React.SetStateAction<TimesheetImportPreviewRow[]>
    >;
    workerMatchGroupsByImportedName: Map<
        string,
        TimesheetImportWorkerMatchGroup
    >;
    activeWorkers: TimesheetImportWorker[];
    onManualWorkerMatch: (importedName: string, workerId: string) => void;
    onAddRowForWorker: (workerName: string) => void;
    onUpdateRow: (
        rowIndex: number,
        field: "workerName" | "dateIn" | "dateOut" | "timeIn" | "timeOut",
        value: string,
    ) => void;
}) {
    return (
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
                        ({ row, flatIndex: i, isFirstInGroup }, idx) => {
                            const hours = formatClockIntervalHm(
                                row.dateIn,
                                row.timeIn,
                                row.dateOut,
                                row.timeOut,
                            );

                            return (
                                <TableRow
                                    key={i}
                                    className={cn(
                                        hasRowError(row) &&
                                            "bg-destructive/10 hover:bg-destructive/25",
                                        isFirstInGroup &&
                                            idx > 0 &&
                                            "border-t-2 border-muted-foreground/20",
                                    )}>
                                    <TableCell
                                        className={cn(
                                            "p-1 min-w-[180px]",
                                            !isFirstInGroup && "pl-8",
                                        )}>
                                        {isFirstInGroup ? (
                                            <ImportPreviewWorkerCell
                                                rowIndex={i}
                                                importedName={row.workerName}
                                                matchGroup={workerMatchGroupsByImportedName.get(
                                                    row.workerName,
                                                )}
                                                activeWorkers={activeWorkers}
                                                onManualWorkerMatch={
                                                    onManualWorkerMatch
                                                }
                                                onAddRowForWorker={
                                                    onAddRowForWorker
                                                }
                                            />
                                        ) : (
                                            <span className="text-muted-foreground/50">
                                                └
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="p-1">
                                        <ContentEditableDateCell
                                            rowIndex={i}
                                            field="dateIn"
                                            value={row.dateIn}
                                            invalid={isPreviewDateInvalid(
                                                row.dateIn,
                                            )}
                                            onCommit={onUpdateRow}
                                        />
                                    </TableCell>
                                    <TableCell className="p-1">
                                        <ContentEditableTimeCell
                                            rowIndex={i}
                                            field="timeIn"
                                            displayText={row.timeIn}
                                            invalid={isPreviewTimeInInvalid(
                                                row.timeIn,
                                            )}
                                            onCommit={onUpdateRow}
                                        />
                                    </TableCell>
                                    <TableCell className="p-1">
                                        <ContentEditableDateCell
                                            rowIndex={i}
                                            field="dateOut"
                                            value={row.dateOut}
                                            invalid={isPreviewDateInvalid(
                                                row.dateOut,
                                            )}
                                            onCommit={onUpdateRow}
                                        />
                                    </TableCell>
                                    <TableCell className="p-1">
                                        <ContentEditableTimeCell
                                            rowIndex={i}
                                            field="timeOut"
                                            displayText={row.timeOut || "—"}
                                            invalid={isPreviewTimeOutInvalid(
                                                row.timeOut,
                                            )}
                                            onCommit={onUpdateRow}
                                            emptyPlaceholderEmDash
                                        />
                                    </TableCell>
                                    <TableCell
                                        className={`p-1 tabular-nums ${hours === "0h" ? "text-destructive" : "text-muted-foreground"}`}>
                                        {hours}
                                    </TableCell>
                                    <TableCell className="w-10 p-1">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onEditableRowsChange((prev) =>
                                                    prev.filter(
                                                        (_, idx) => idx !== i,
                                                    ),
                                                )
                                            }
                                            className="text-muted-foreground hover:text-destructive rounded p-1"
                                            aria-label="Delete entry">
                                            <Trash2 className="size-4" />
                                        </button>
                                    </TableCell>
                                </TableRow>
                            );
                        },
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
