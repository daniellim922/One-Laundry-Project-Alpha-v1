"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ParseResult =
    | { ok: true; value: number | null }
    | { ok: false; error: string };

export function VoucherEditableField({
    label,
    readOnly = false,
    size = "default",
    fullWidth = false,
    align = "left",
    prefixSlot,
    inputMode = "decimal",
    committedDisplay,
    parseForCommit,
    commit,
}: {
    label: string;
    readOnly?: boolean;
    size?: "default" | "lg";
    fullWidth?: boolean;
    align?: "left" | "right";
    prefixSlot?: React.ReactNode;
    inputMode?: "decimal";
    committedDisplay: string;
    parseForCommit: (text: string) => ParseResult;
    commit: (
        value: number | null,
    ) => Promise<unknown>;
}) {
    const router = useRouter();
    const isLg = size === "lg";
    const [text, setText] = useState(committedDisplay);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setText(committedDisplay);
    }, [committedDisplay]);

    const commitAction = () => {
        if (readOnly) return;
        const parsed = parseForCommit(text);
        if (!parsed.ok) {
            setError(parsed.error);
            return;
        }
        setError(null);
        startTransition(async () => {
            const res = await commit(parsed.value);
            if (
                res &&
                typeof res === "object" &&
                "error" in res &&
                typeof (res as { error?: unknown }).error === "string"
            ) {
                setError((res as { error: string }).error);
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
                        prefixSlot ? "relative" : undefined,
                        fullWidth && "min-w-0 flex-1",
                    )}>
                    {prefixSlot}
                    <Input
                        aria-label={label}
                        inputMode={inputMode}
                        value={text}
                        readOnly={readOnly}
                        disabled={readOnly || isPending}
                        className={cn(
                            "font-medium tabular-nums",
                            align === "left" ? "text-left" : "text-right",
                            prefixSlot
                                ? "pl-5"
                                : align === "left"
                                  ? "pl-2.5"
                                  : "",
                            isLg ? "h-9 text-base" : "h-8 text-sm",
                            fullWidth ? "w-full" : isLg ? "w-28" : "w-24",
                        )}
                        onChange={(e) => setText(e.currentTarget.value)}
                        onBlur={commitAction}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                (e.currentTarget as HTMLInputElement).blur();
                            }
                            if (e.key === "Escape") {
                                e.preventDefault();
                                setText(committedDisplay);
                                (e.currentTarget as HTMLInputElement).blur();
                            }
                        }}
                    />
                </div>
                {isPending ? (
                    <span
                        className={cn(
                            "text-muted-foreground",
                            isLg ? "text-sm" : "text-xs",
                        )}>
                        Saving…
                    </span>
                ) : null}
            </div>
            {error ? (
                <p className={cn("text-red-600", isLg ? "text-sm" : "text-xs")}>
                    {error}
                </p>
            ) : null}
        </div>
    );
}
