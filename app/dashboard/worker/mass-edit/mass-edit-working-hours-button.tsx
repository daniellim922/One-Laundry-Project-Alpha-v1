"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { RowSelectionState } from "@tanstack/react-table";
import { ListChecks } from "lucide-react";
import { useRouter } from "next/navigation";

import { massUpdateWorkerMinimumWorkingHours } from "../actions";
import { DataTable } from "@/components/data-table/data-table";
import {
    createBadgeCell,
    createRowSelectionColumn,
    createSortableHeader,
} from "@/components/data-table/column-builders";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { MassEditWorkingHoursResultRow } from "./mass-edit-working-hours-result-table";
import { employmentArrangementBadgeTone } from "@/types/badge-tones";
import type { WorkerEmploymentArrangement } from "@/types/status";

type WorkerForMassEdit = {
    id: string;
    name: string;
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

export function MassEditWorkingHoursButton({
    workers,
    onResult,
}: {
    workers: WorkerForMassEdit[];
    onResult?: (rows: MassEditWorkingHoursResultRow[]) => void;
}) {
    const router = useRouter();
    const [open, setOpen] = React.useState(false);
    const [pending, setPending] = React.useState(false);
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(
        {},
    );
    const [nextHoursByWorkerId, setNextHoursByWorkerId] = React.useState<
        Record<string, string>
    >({});
    const [nameFilter, setNameFilter] = React.useState("");
    const [sharedHoursInput, setSharedHoursInput] = React.useState("");
    const [dialogError, setDialogError] = React.useState<string | null>(null);

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

    const resetDialogState = React.useCallback(() => {
        setDialogError(null);
        setNameFilter("");
        setSharedHoursInput("");
        setNextHoursByWorkerId({});
        setRowSelection({});
    }, []);

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);
        if (nextOpen) {
            resetDialogState();
            return;
        }
        setDialogError(null);
    };

    const handleApplySharedValue = () => {
        setDialogError(null);
        const parsed = parseNonNegativeNumber(sharedHoursInput);
        if (parsed == null) {
            setDialogError("Enter a non-negative number before applying.");
            return;
        }

        if (selectedCount === 0) {
            setDialogError("Select at least one worker before applying.");
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
        setDialogError(null);

        if (selectedCount === 0) {
            setDialogError("Select at least one worker to update.");
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
                    ? await massUpdateWorkerMinimumWorkingHours({ updates })
                    : { updatedCount: 0, failed: [] as MassEditFailure[] };

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

            const resultRows: MassEditWorkingHoursResultRow[] =
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

            onResult?.(resultRows);
            setOpen(false);
            if (result.updatedCount > 0) {
                router.refresh();
            }
        } catch (error) {
            console.error("Failed to mass edit working hours", error);
            setDialogError("Failed to save mass edit. Please try again.");
        } finally {
            setPending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button type="button" variant="outline">
                    <ListChecks className="mr-2 h-4 w-4" />
                    Mass edit working hours
                </Button>
            </DialogTrigger>
            <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] flex-col sm:max-w-[calc(100vw-2rem)] [&_button]:cursor-pointer">
                <DialogHeader>
                    <DialogTitle>Mass edit working hours</DialogTitle>
                    <DialogDescription>
                        Select workers and set their minimum working hours. Only
                        Active Full Time Foreign Workers are shown.
                    </DialogDescription>
                </DialogHeader>

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

                <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-auto">
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

                {dialogError ? (
                    <p className="text-sm text-destructive">{dialogError}</p>
                ) : null}

                <DialogFooter>
                    <DialogClose asChild>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={pending}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        type="button"
                        disabled={pending || selectedCount === 0}
                        onClick={handleSave}>
                        {pending
                            ? "Saving..."
                            : `Save selected (${selectedCount})`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
