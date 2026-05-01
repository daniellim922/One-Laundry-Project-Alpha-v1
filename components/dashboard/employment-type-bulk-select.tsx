"use client";

import { EnumBulkSelect } from "@/components/dashboard/enum-bulk-select";
import {
    WORKER_EMPLOYMENT_TYPES,
    type WorkerEmploymentType,
} from "@/types/status";

type WorkerIdMeta = { id: string; employmentType: WorkerEmploymentType };

type Props = {
    allWorkers: WorkerIdMeta[];
    checked: Record<string, boolean>;
    onTypeBulkChange: (t: WorkerEmploymentType, value: boolean) => void;
    className?: string;
    disabled?: boolean;
};

export function EmploymentTypeBulkSelect({
    allWorkers,
    checked,
    onTypeBulkChange,
    className,
    disabled,
}: Props) {
    return (
        <EnumBulkSelect
            allWorkers={allWorkers}
            checked={checked}
            enumValues={WORKER_EMPLOYMENT_TYPES}
            getWorkerValue={(w) => w.employmentType}
            allSelectedLabel="All types"
            searchPlaceholder="Search types…"
            emptyMessage="No type found."
            ariaLabel="Bulk select by employment type"
            triggerClassName="h-9 min-w-36 max-w-56 justify-between px-3 py-2 font-normal shadow-xs"
            onBulkChange={onTypeBulkChange}
            className={className}
            disabled={disabled}
        />
    );
}
