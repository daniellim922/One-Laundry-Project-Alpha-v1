"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestUpdateVoucherPayRate } from "../command-api";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { VoucherPayRateField } from "@/services/payroll/update-voucher-pay-rates";

type Props = {
    payrollId: string;
    voucherId: string;
    label: string;
    field: VoucherPayRateField;
    value: number | null;
    readOnly?: boolean;
    size?: "default" | "lg";
    /** Hours-style numbers without a $ prefix. */
    format?: "currency" | "plain";
    /** Full-width input in grid layouts; default keeps compact pay-rate fields. */
    fullWidth?: boolean;
};

function parseAmount(text: string, format: "currency" | "plain"): number | null {
    const stripped =
        format === "currency" ? text.replace(/^\$/, "").trim() : text.trim();
    if (!stripped) return null;
    const n = Number(stripped);
    if (!Number.isFinite(n)) return null;
    return n;
}

function formatInitial(n: number | null): string {
    if (n == null) return "";
    return n === 0 ? "0" : String(n);
}

export function VoucherEditableMoney({
    payrollId,
    voucherId,
    label,
    field,
    value,
    readOnly = false,
    size = "default",
    format = "currency",
    fullWidth = false,
}: Props) {
    const router = useRouter();
    const isLg = size === "lg";
    const initial = useMemo(() => formatInitial(value), [value]);
    const [text, setText] = useState(initial);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setText(formatInitial(value));
    }, [value]);

    const commit = () => {
        if (readOnly) return;
        const parsed = parseAmount(text, format);
        const numeric =
            field === "minimumWorkingHours" ? parsed : (parsed ?? 0);
        if (numeric !== null && numeric < 0) {
            setError("Must be ≥ 0");
            return;
        }

        setError(null);
        startTransition(async () => {
            const res = await requestUpdateVoucherPayRate({
                payrollId,
                voucherId,
                field,
                value: numeric,
            });

            if (res && "error" in res && res.error) {
                setError(res.error);
                return;
            }
            router.refresh();
        });
    };

    return (
        <div
            className={cn(
                "space-y-1",
                fullWidth && "w-full",
                (readOnly || isPending) && "cursor-not-allowed",
            )}>
            <p
                className={cn(
                    "text-muted-foreground",
                    isLg ? "text-base" : "text-sm",
                )}>
                {label}
            </p>
            <div
                className={cn(
                    "flex items-baseline gap-2",
                    fullWidth && "w-full min-w-0",
                )}>
                <div
                    className={cn(
                        "relative",
                        fullWidth && "min-w-0 flex-1",
                    )}>
                    {format === "currency" ? (
                        <span
                            className={cn(
                                "pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground",
                                isLg ? "text-base" : "text-sm",
                            )}
                            aria-hidden>
                            $
                        </span>
                    ) : null}
                    <Input
                        aria-label={label}
                        inputMode="decimal"
                        value={text}
                        readOnly={readOnly}
                        disabled={readOnly || isPending}
                        className={cn(
                            "text-left font-medium tabular-nums",
                            format === "currency" ? "pl-5" : "pl-2.5",
                            isLg ? "h-9 text-base" : "h-8 text-sm",
                            fullWidth
                                ? "w-full"
                                : isLg
                                  ? "w-28"
                                  : "w-24",
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
                </div>
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
