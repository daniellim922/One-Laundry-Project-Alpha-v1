"use client";

import { useMemo, useState, useTransition } from "react";
import { updateVoucherDays } from "../actions";
import { Input } from "@/components/ui/input";

type Props = {
    payrollId: string;
    voucherId: string;
    label: string;
    field: "restDays" | "publicHolidays";
    restDays: number | null;
    publicHolidays: number | null;
    readOnly?: boolean;
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
}: Props) {
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
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="flex items-baseline gap-2">
                <Input
                    aria-label={label}
                    inputMode="decimal"
                    value={text}
                    readOnly={readOnly}
                    disabled={readOnly || isPending}
                    className="h-8 w-24 text-right text-sm font-medium tabular-nums"
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
                    <span className="text-xs text-muted-foreground">Saving…</span>
                )}
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    );
}

