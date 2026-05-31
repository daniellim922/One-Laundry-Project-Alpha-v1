import type { OverlapEntry } from "@/services/timesheet/import-attend-record-timesheet";
import { Button } from "@/components/ui/button";

import { AmberCallout } from "./amber-callout";

export function OverlapConfirmationPanel({
    overlaps,
    pending,
    onSkipDuplicates,
    onImportAll,
}: {
    overlaps: OverlapEntry[];
    pending: boolean;
    onSkipDuplicates: () => void;
    onImportAll: () => void;
}) {
    if (overlaps.length === 0) return null;

    const totalExisting = overlaps.reduce((sum, o) => sum + o.existingCount, 0);
    const workerCount = new Set(overlaps.map((o) => o.workerName)).size;

    return (
        <AmberCallout title="Overlapping timesheet dates">
            <p className="mt-1">
                {totalExisting} entr{totalExisting !== 1 ? "ies" : "y"} already
                exist for {workerCount} worker{workerCount !== 1 ? "s" : ""} on
                the selected dates. Choose how to proceed.
            </p>
            <ul className="mt-2 max-h-32 list-inside list-disc overflow-y-auto">
                {overlaps.map((o, idx) => (
                    <li key={`${o.workerName}-${o.dateIn}-${idx}`}>
                        {o.workerName} — {o.dateIn} ({o.existingCount} existing)
                    </li>
                ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={onSkipDuplicates}>
                    Skip duplicates
                </Button>
                <Button
                    type="button"
                    size="sm"
                    disabled={pending}
                    onClick={onImportAll}>
                    Import all anyway
                </Button>
            </div>
        </AmberCallout>
    );
}
