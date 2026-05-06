import type { WorkerShiftPattern, WorkerStatus } from "@/types/status";

export type TimesheetImportWorker = {
    id: string;
    name: string;
    status: WorkerStatus;
    shiftPattern: WorkerShiftPattern;
};

export type TimesheetImportWorkerRow = {
    workerName: string;
};

export type TimesheetImportWorkerMatchGroup = {
    importedName: string;
    rowCount: number;
    resolvedWorker: TimesheetImportWorker | null;
};

export type TimesheetImportWorkerMatchResult = {
    groups: TimesheetImportWorkerMatchGroup[];
    unresolvedNames: string[];
};

function normalizeWorkerName(name: string): string {
    return name.trim().toLowerCase();
}

export function resolveTimesheetImportWorkerForImportedName({
    importedName,
    workers,
    manualMatchesByImportedName = {},
}: {
    importedName: string;
    workers: TimesheetImportWorker[];
    manualMatchesByImportedName?: Record<string, string>;
}): TimesheetImportWorker | null {
    const activeWorkersByName = new Map<string, TimesheetImportWorker[]>();
    const activeWorkersById = new Map<string, TimesheetImportWorker>();

    for (const worker of workers) {
        if (worker.status !== "Active") continue;

        activeWorkersById.set(worker.id, worker);
        const normalizedName = normalizeWorkerName(worker.name);
        const matchingWorkers = activeWorkersByName.get(normalizedName) ?? [];
        matchingWorkers.push(worker);
        activeWorkersByName.set(normalizedName, matchingWorkers);
    }

    const manualWorkerId = manualMatchesByImportedName[importedName];
    const manualWorker = manualWorkerId
        ? activeWorkersById.get(manualWorkerId)
        : null;
    const exactMatches =
        activeWorkersByName.get(normalizeWorkerName(importedName)) ?? [];

    return manualWorker ?? (exactMatches.length === 1 ? exactMatches[0]! : null);
}

export function resolveTimesheetImportWorkerMatches({
    rows,
    workers,
    manualMatchesByImportedName = {},
}: {
    rows: TimesheetImportWorkerRow[];
    workers: TimesheetImportWorker[];
    manualMatchesByImportedName?: Record<string, string>;
}): TimesheetImportWorkerMatchResult {
    const groupsByName = new Map<
        string,
        { importedName: string; rowCount: number }
    >();

    for (const row of rows) {
        const normalizedName = normalizeWorkerName(row.workerName);
        const group = groupsByName.get(normalizedName);

        if (group) {
            group.rowCount += 1;
        } else {
            groupsByName.set(normalizedName, {
                importedName: row.workerName,
                rowCount: 1,
            });
        }
    }

    const groups = Array.from(groupsByName.entries()).map(([, group]) => {
        const resolvedWorker = resolveTimesheetImportWorkerForImportedName({
            importedName: group.importedName,
            workers,
            manualMatchesByImportedName,
        });

        return {
            importedName: group.importedName,
            rowCount: group.rowCount,
            resolvedWorker,
        };
    });

    return {
        groups,
        unresolvedNames: groups
            .filter((group) => group.resolvedWorker == null)
            .map((group) => group.importedName),
    };
}
