import { Plus, TriangleAlert } from "lucide-react";

import { SelectSearch } from "@/components/ui/SelectSearch";
import type { TimesheetImportWorkerMatchGroup } from "../worker-matching";
import type { TimesheetImportWorker } from "../worker-matching";

export function ImportPreviewWorkerCell({
    rowIndex,
    importedName,
    matchGroup,
    activeWorkers,
    onManualWorkerMatch,
    onAddRowForWorker,
}: {
    rowIndex: number;
    importedName: string;
    matchGroup: TimesheetImportWorkerMatchGroup | undefined;
    activeWorkers: TimesheetImportWorker[];
    onManualWorkerMatch: (importedName: string, workerId: string) => void;
    onAddRowForWorker: (workerName: string) => void;
}) {
    return (
        <div className="flex items-center gap-2">
            {matchGroup?.resolvedWorker == null ? (
                <span
                    role="img"
                    aria-label="Imported name does not match an active worker — select a worker to continue"
                    title="Imported name does not match an active worker — select a worker to continue"
                    className="ml-2 flex shrink-0 items-center justify-center">
                    <TriangleAlert className="text-destructive size-6" />
                </span>
            ) : null}
            <div className="flex-1 space-y-1">
                <SelectSearch
                    options={activeWorkers.map((w) => ({
                        value: w.id,
                        label: w.name,
                    }))}
                    value={matchGroup?.resolvedWorker?.id ?? ""}
                    onChange={(id) => onManualWorkerMatch(importedName, id)}
                    name={`worker-${rowIndex}`}
                    placeholder={importedName || "Select worker"}
                    searchPlaceholder="Search workers…"
                    emptyText="No workers found."
                />
                <p className="text-muted-foreground text-xs">
                    Source: {importedName}
                </p>
            </div>
            <button
                type="button"
                onClick={() => onAddRowForWorker(importedName)}
                className="text-muted-foreground hover:text-primary shrink-0 rounded p-1"
                aria-label={`Add row for ${importedName}`}>
                <Plus className="size-4" />
            </button>
        </div>
    );
}
