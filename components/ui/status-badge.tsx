import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type LoanPaidStatus = "loan" | "paid";

export const loanPaidToneClassName: Record<LoanPaidStatus, string> = {
    loan: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
    paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
};

export type StatusBadgeProps = Omit<
    React.ComponentProps<typeof Badge>,
    "children"
> & {
    label: React.ReactNode;
    toneClassName?: string;
};

export function StatusBadge({
    label,
    toneClassName,
    className,
    variant = "outline",
    ...props
}: StatusBadgeProps) {
    return (
        <Badge
            variant={variant}
            className={cn(
                "border-transparent shadow-none",
                toneClassName,
                className,
            )}
            {...props}>
            {label}
        </Badge>
    );
}
