"use client";

import { useMemo, useState, useTransition } from "react";
import { updateVoucherDays } from "../command-api";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
    payrollId: string;
    voucherId: string;
    label: string;
    field: "restDays" | "publicHolidays";
    restDays: number | null;
    publicHolidays: number | null;
    readOnly?: boolean;
    /** Larger typography for dense summary / voucher tape rows */
    size?: "default" | "lg";
};

function parseNumber(text: string): number | null {
    const trimmed = text.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return null;
    return n;
}

export function VoucherEditableNumber({
    payrollId,
    voucherId,
    label,
    field,
    restDays,
    publicHolidays,
    readOnly = false,
    size = "default",
}: Props) {
    const isLg = size === "lg";
    const currentValue = field === "restDays" ? restDays : publicHolidays;
    const initial = useMemo(
        () => (currentValue == null ? "" : String(currentValue)),
        [currentValue],
    );
    const [text, setText] = useState(initial);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const commit = () => {
        if (readOnly) return;
        const parsed = parseNumber(text);
        const numeric = parsed ?? 0;
        if (numeric < 0) {
            setError("Must be ≥ 0");
            return;
        }

        setError(null);
        startTransition(async () => {
            const nextRestDays = field === "restDays" ? numeric : (restDays ?? 0);
            const nextPublicHolidays =
                field === "publicHolidays" ? numeric : (publicHolidays ?? 0);

            const res = await updateVoucherDays({
                payrollId,
                voucherId,
                restDays: nextRestDays,
                publicHolidays: nextPublicHolidays,
            });

            if (res && "error" in res && res.error) {
                setError(res.error);
            }
        });
    };

    return (
        <div className="space-y-1">
            <p
                className={cn(
                    "text-muted-foreground",
                    isLg ? "text-base" : "text-sm",
                )}>
                {label}
            </p>
            <div className="flex items-baseline gap-2">
                <Input
                    aria-label={label}
                    inputMode="decimal"
                    value={text}
                    readOnly={readOnly}
                    disabled={readOnly || isPending}
                    className={cn(
                        "text-right font-medium tabular-nums",
                        isLg
                            ? "h-9 w-28 text-base"
                            : "h-8 w-24 text-sm",
                    )}
                    onChange={(e) => setText(e.currentTarget.value)}
                    onBlur={commit}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            (e.currentTarget as HTMLInputElement).blur();
                        }
                        if (e.key === "Escape") {
                            e.preventDefault();
                            setText(initial);
                            (e.currentTarget as HTMLInputElement).blur();
                        }
                    }}
                />
                {isPending && (
                    <span
                        className={cn(
                            "text-muted-foreground",
                            isLg ? "text-sm" : "text-xs",
                        )}>
                        Saving…
                    </span>
                )}
            </div>
            {error && (
                <p className={cn("text-red-600", isLg ? "text-sm" : "text-xs")}>
                    {error}
                </p>
            )}
        </div>
    );
}
