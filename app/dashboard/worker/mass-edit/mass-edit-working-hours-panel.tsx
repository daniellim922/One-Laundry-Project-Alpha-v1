"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { RowSelectionState } from "@tanstack/react-table";
import { useRouter } from "next/navigation";

import { DataTable } from "@/components/data-table/data-table";
import {
    createBadgeCell,
    createRowSelectionColumn,
    createSortableHeader,
} from "@/components/data-table/column-builders";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    MassEditWorkingHoursResultTable,
    type MassEditWorkingHoursResultRow,
} from "./mass-edit-working-hours-result-table";
import { updateWorkerMinimumWorkingHours } from "./update-worker-minimum-working-hours";
import {
    employmentArrangementBadgeTone,
    employmentTypeBadgeTone,
    workerStatusBadgeTone,
} from "@/types/badge-tones";
import type {
    WorkerEmploymentArrangement,
    WorkerEmploymentType,
    WorkerStatus,
} from "@/types/status";

export type WorkerForMassEdit = {
    id: string;
    name: string;
    status: WorkerStatus;
    employmentType: WorkerEmploymentType;
    employmentArrangement: WorkerEmploymentArrangement;
    minimumWorkingHours: number | null;
};

type MassEditFailure = {
    workerId: string;
    workerName: string;
    error: string;
};

function parseNonNegativeNumber(text: string): number | null {
    const value = text.trim();
    if (!value) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return parsed;
}

export function MassEditWorkingHoursPanel({
    workers,
}: {
    workers: WorkerForMassEdit[];
}) {
    const router = useRouter();
    const [pending, setPending] = React.useState(false);
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(
        {},
    );
    const [nextHoursByWorkerId, setNextHoursByWorkerId] = React.useState<
        Record<string, string>
    >({});
    const [nameFilter, setNameFilter] = React.useState("");
    const [sharedHoursInput, setSharedHoursInput] = React.useState("");
    const [saveError, setSaveError] = React.useState<string | null>(null);
    const [resultRows, setResultRows] = React.useState<
        MassEditWorkingHoursResultRow[]
    >([]);

    const selectedIds = React.useMemo(
        () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
        [rowSelection],
    );

    const selectedCount = selectedIds.length;
    const normalizedNameFilter = nameFilter.trim().toLowerCase();

    const filteredWorkers = React.useMemo(() => {
        if (!normalizedNameFilter) {
            return workers;
        }

        return workers.filter((worker) =>
            worker.name.toLowerCase().includes(normalizedNameFilter),
        );
    }, [normalizedNameFilter, workers]);

    const columns = React.useMemo<ColumnDef<WorkerForMassEdit>[]>(
        () => [
            createRowSelectionColumn<WorkerForMassEdit>({
                ariaLabelForRow: (worker) => `Select ${worker.name}`,
            }),
            {
                accessorKey: "name",
                header: createSortableHeader("Worker"),
                meta: {
                    globalSearch: false,
                    externalTextFilter: {
                        value: nameFilter,
                        onChange: setNameFilter,
                    },
                },
            },
            {
                accessorKey: "status",
                header: createSortableHeader("Status"),
                enableColumnFilter: false,
                meta: { globalSearch: false },
                cell: createBadgeCell<WorkerForMassEdit>({
                    value: (worker) => worker.status,
                    variant: "outline",
                    toneClassNameFor: (worker) =>
                        workerStatusBadgeTone[worker.status],
                }),
            },
            {
                accessorKey: "employmentType",
                header: createSortableHeader("Employment Type"),
                enableColumnFilter: false,
                meta: { globalSearch: false },
                cell: createBadgeCell<WorkerForMassEdit>({
                    value: (worker) => worker.employmentType,
                    variant: "outline",
                    toneClassNameFor: (worker) =>
                        employmentTypeBadgeTone[worker.employmentType],
                }),
            },
            {
                accessorKey: "employmentArrangement",
                header: createSortableHeader("Employment Arrangement"),
                enableColumnFilter: false,
                meta: { globalSearch: false },
                cell: createBadgeCell<WorkerForMassEdit>({
                    value: (worker) => worker.employmentArrangement,
                    variant: "outline",
                    toneClassNameFor: (worker) =>
                        employmentArrangementBadgeTone[
                            worker.employmentArrangement
                        ],
                }),
            },
            {
                accessorKey: "minimumWorkingHours",
                header: createSortableHeader("Current Minimum Hours"),
                enableColumnFilter: false,
                meta: { globalSearch: false },
                cell: ({ row }) =>
                    row.original.minimumWorkingHours != null
                        ? `${row.original.minimumWorkingHours}h`
                        : "—",
            },
            {
                id: "newMinimumWorkingHours",
                header: "New Minimum Hours",
                enableSorting: false,
                enableColumnFilter: false,
                meta: { globalSearch: false },
                cell: ({ row }) => {
                    const worker = row.original;
                    const value = nextHoursByWorkerId[worker.id] ?? "";

                    return (
                        <Input
                            aria-label={`New minimum hours for ${worker.name}`}
                            inputMode="decimal"
                            value={value}
                            placeholder="e.g. 260"
                            disabled={pending}
                            className="h-8 w-28 text-right text-xs"
                            onChange={(event) => {
                                const nextValue = event.target.value;
                                setNextHoursByWorkerId((prev) => ({
                                    ...prev,
                                    [worker.id]: nextValue,
                                }));
                                setRowSelection((prev) => ({
                                    ...prev,
                                    [worker.id]: true,
                                }));
                            }}
                        />
                    );
                },
            },
        ],
        [nameFilter, nextHoursByWorkerId, pending],
    );

    const resetFormState = React.useCallback(() => {
        setSaveError(null);
        setNameFilter("");
        setSharedHoursInput("");
        setNextHoursByWorkerId({});
        setRowSelection({});
    }, []);

    const handleApplySharedValue = () => {
        setSaveError(null);
        const parsed = parseNonNegativeNumber(sharedHoursInput);
        if (parsed == null) {
            setSaveError("Enter a non-negative number before applying.");
            return;
        }

        if (selectedCount === 0) {
            setSaveError("Select at least one worker before applying.");
            return;
        }

        const nextValue = String(parsed);
        setNextHoursByWorkerId((prev) => {
            const next = { ...prev };
            for (const workerId of selectedIds) {
                next[workerId] = nextValue;
            }
            return next;
        });
    };

    const handleSave = async () => {
        setSaveError(null);

        if (selectedCount === 0) {
            setSaveError("Select at least one worker to update.");
            return;
        }

        const selectedWorkers = workers.filter(
            (worker) => rowSelection[worker.id],
        );
        const failedFromClientValidation: MassEditFailure[] = [];
        const updates: Array<{
            workerId: string;
            minimumWorkingHours: number;
        }> = [];

        for (const worker of selectedWorkers) {
            const rawValue = nextHoursByWorkerId[worker.id];
            if (rawValue == null || rawValue.trim() === "") {
                failedFromClientValidation.push({
                    workerId: worker.id,
                    workerName: worker.name,
                    error: "Minimum working hours is required.",
                });
                continue;
            }

            const parsed = parseNonNegativeNumber(rawValue);
            if (parsed == null) {
                failedFromClientValidation.push({
                    workerId: worker.id,
                    workerName: worker.name,
                    error: "Minimum working hours must be a non-negative number.",
                });
                continue;
            }

            updates.push({
                workerId: worker.id,
                minimumWorkingHours: parsed,
            });
        }

        setPending(true);

        try {
            const result =
                updates.length > 0
                    ? await updateWorkerMinimumWorkingHours({ updates })
                    : { updatedCount: 0, failed: [] as MassEditFailure[] };

            if ("error" in result) {
                setSaveError(result.error);
                return;
            }

            const clientFailuresByWorkerId = new Set(
                failedFromClientValidation.map((failure) => failure.workerId),
            );
            const serverFailuresByWorkerId = new Set(
                result.failed.map((failure) => failure.workerId),
            );
            const requestedHoursByWorkerId = new Map(
                updates.map((update) => [
                    update.workerId,
                    update.minimumWorkingHours,
                ]),
            );

            const nextResultRows: MassEditWorkingHoursResultRow[] =
                selectedWorkers.map((worker) => {
                    const failed =
                        clientFailuresByWorkerId.has(worker.id) ||
                        serverFailuresByWorkerId.has(worker.id);
                    return {
                        workerId: worker.id,
                        name: worker.name,
                        employmentArrangement: worker.employmentArrangement,
                        oldWorkingHours: worker.minimumWorkingHours ?? null,
                        newWorkingHours: failed
                            ? null
                            : (requestedHoursByWorkerId.get(worker.id) ?? null),
                        status: failed ? "failed" : "updated",
                    };
                });

            setResultRows(nextResultRows);
            resetFormState();
            if (result.updatedCount > 0) {
                router.refresh();
            }
        } catch (error) {
            console.error("Failed to mass edit working hours", error);
            setSaveError("Failed to save mass edit. Please try again.");
        } finally {
            setPending(false);
        }
    };

    return (
        <div
            className="space-y-6"
            data-testid="mass-edit-working-hours-panel">
            <MassEditWorkingHoursResultTable rows={resultRows} />

            <Card>
                <CardHeader>
                    <CardTitle>Mass edit working hours</CardTitle>
                    <CardDescription>
                        Select workers and set their minimum working hours. Only
                        Active Full Time Foreign Workers are shown.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-end gap-2 rounded-md border p-3">
                        <div className="space-y-1">
                            <label
                                htmlFor="mass-edit-shared-hours"
                                className="text-xs font-medium text-muted-foreground">
                                Shared minimum hours
                            </label>
                            <Input
                                id="mass-edit-shared-hours"
                                inputMode="decimal"
                                value={sharedHoursInput}
                                onChange={(event) =>
                                    setSharedHoursInput(event.target.value)
                                }
                                placeholder="e.g. 260"
                                disabled={pending}
                                className="h-8 w-40 text-right text-xs"
                            />
                        </div>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={pending}
                            onClick={handleApplySharedValue}>
                            Apply to selected
                        </Button>
                        <p className="text-xs text-muted-foreground">
                            {selectedCount} worker
                            {selectedCount !== 1 ? "s" : ""} selected
                        </p>
                    </div>

                    <div className="max-h-[min(70vh,720px)] min-h-0 min-w-0 overflow-x-auto overflow-y-auto">
                        <DataTable
                            columns={columns}
                            data={filteredWorkers}
                            syncSearchToUrl={false}
                            showGlobalSearch={false}
                            pageSize={20}
                            enableRowSelection
                            rowSelection={rowSelection}
                            onRowSelectionChange={setRowSelection}
                            getRowId={(row) => row.id}
                        />
                    </div>

                    {saveError ? (
                        <p className="text-sm text-destructive">{saveError}</p>
                    ) : null}
                </CardContent>

                <CardFooter className="justify-end border-t pt-6">
                    <Button
                        type="button"
                        disabled={pending || selectedCount === 0}
                        onClick={handleSave}>
                        {pending
                            ? "Saving..."
                            : `Save selected (${selectedCount})`}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
