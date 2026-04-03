import { Badge } from "@/components/ui/badge";
import {
    loanPaidToneClassName,
    payrollStatusBadgeTone,
    timesheetPaymentStatusBadgeTone,
    workerStatusBadgeTone,
} from "@/types/badge-tones";
import type {
    LoanPaidStatus,
    PayrollStatus,
    TimesheetPaymentStatus,
    WorkerStatus,
} from "@/types/status";
import { cn } from "@/lib/utils";

type EntityStatus =
    | LoanPaidStatus
    | TimesheetPaymentStatus
    | PayrollStatus
    | WorkerStatus
    | string;

const knownStatusToneClassName = {
    ...loanPaidToneClassName,
    ...timesheetPaymentStatusBadgeTone,
    ...payrollStatusBadgeTone,
    ...workerStatusBadgeTone,
};

function toStatusLabel(status: EntityStatus): string {
    if (status.length === 0) return status;
    return status.charAt(0).toUpperCase() + status.slice(1);
}

export function EntityStatusBadge({
    status,
    label,
    className,
}: {
    status: EntityStatus;
    label?: string;
    className?: string;
}) {
    return (
        <Badge
            variant="outline"
            className={cn(
                status in knownStatusToneClassName
                    ? knownStatusToneClassName[
                          status as keyof typeof knownStatusToneClassName
                      ]
                    : "bg-muted text-muted-foreground",
                className,
            )}>
            {label ?? toStatusLabel(status)}
        </Badge>
    );
}
