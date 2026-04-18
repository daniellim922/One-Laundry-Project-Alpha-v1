"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export function IndeterminateProgress({
    className,
    ...props
}: React.ComponentProps<"div">) {
    return (
        <div
            role="progressbar"
            aria-busy="true"
            aria-label="In progress"
            aria-valuetext="In progress"
            className={cn(
                "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
                className,
            )}
            {...props}>
            <div
                className="bg-primary absolute h-full w-2/5 rounded-full animate-payroll-zip-indeterminate"
                aria-hidden
            />
        </div>
    );
}
