"use client";

import {
    EnumBulkSelect,
} from "@/components/dashboard/enum-bulk-select";
import {
    WORKER_EMPLOYMENT_ARRANGEMENTS,
    type WorkerEmploymentArrangement,
} from "@/types/status";

type WorkerIdMeta = { id: string; employmentArrangement: WorkerEmploymentArrangement };

type Props = {
    allWorkers: WorkerIdMeta[];
    checked: Record<string, boolean>;
    onArrangementBulkChange: (
        a: WorkerEmploymentArrangement,
        value: boolean,
    ) => void;
    className?: string;
    disabled?: boolean;
};

export function EmploymentArrangementBulkSelect({
    allWorkers,
    checked,
    onArrangementBulkChange,
    className,
    disabled,
}: Props) {
    return (
        <EnumBulkSelect
            allWorkers={allWorkers}
            checked={checked}
            enumValues={WORKER_EMPLOYMENT_ARRANGEMENTS}
            getWorkerValue={(w) => w.employmentArrangement}
            allSelectedLabel="All arrangements"
            searchPlaceholder="Search arrangements…"
            emptyMessage="No arrangement found."
            ariaLabel="Bulk select by employment arrangement"
            triggerClassName="h-9 min-w-40 max-w-64 justify-between px-3 py-2 font-normal shadow-xs"
            onBulkChange={onArrangementBulkChange}
            className={className}
            disabled={disabled}
        />
    );
}
