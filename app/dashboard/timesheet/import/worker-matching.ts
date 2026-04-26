import type { WorkerStatus } from "@/types/status";

export type TimesheetImportWorker = {
    id: string;
    name: string;
    status: WorkerStatus;
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

export function resolveTimesheetImportWorkerMatches({
    rows,
    workers,
}: {
    rows: TimesheetImportWorkerRow[];
    workers: TimesheetImportWorker[];
}): TimesheetImportWorkerMatchResult {
    const activeWorkersByName = new Map<string, TimesheetImportWorker[]>();

    for (const worker of workers) {
        if (worker.status !== "Active") continue;

        const normalizedName = normalizeWorkerName(worker.name);
        const matchingWorkers = activeWorkersByName.get(normalizedName) ?? [];
        matchingWorkers.push(worker);
        activeWorkersByName.set(normalizedName, matchingWorkers);
    }

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

    const groups = Array.from(groupsByName.entries()).map(
        ([normalizedName, group]) => {
            const exactMatches = activeWorkersByName.get(normalizedName) ?? [];
            const resolvedWorker =
                exactMatches.length === 1 ? exactMatches[0]! : null;

            return {
                importedName: group.importedName,
                rowCount: group.rowCount,
                resolvedWorker,
            };
        },
    );

    return {
        groups,
        unresolvedNames: groups
            .filter((group) => group.resolvedWorker == null)
            .map((group) => group.importedName),
    };
}
