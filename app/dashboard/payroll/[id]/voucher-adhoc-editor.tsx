"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AdhocLineItem } from "@/db/tables/payrollVoucherTable";
import { updateVoucherAdhoc } from "../command-api";

type DraftRow = {
    name: string;
    amount: string;
};

type Props = {
    payrollId: string;
    voucherId: string;
    adhoc: AdhocLineItem[] | null;
    readOnly?: boolean;
};

function toDraftRows(adhoc: AdhocLineItem[] | null): DraftRow[] {
    if (!adhoc?.length) {
        return [];
    }
    return adhoc.map((item) => ({
        name: item.name,
        amount: String(item.amount),
    }));
}

function rowsEqual(a: DraftRow[], b: DraftRow[]): boolean {
    if (a.length !== b.length) return false;
    return a.every(
        (row, index) =>
            row.name === b[index]?.name && row.amount === b[index]?.amount,
    );
}

function parseRowsForCommit(
    rows: DraftRow[],
): { ok: true; value: AdhocLineItem[] } | { ok: false; error: string } {
    const parsed: AdhocLineItem[] = [];

    for (const row of rows) {
        const name = row.name.trim();
        const amountText = row.amount.trim().replace(/^\$/, "");
        const bothEmpty = !name && !amountText;
        if (bothEmpty) {
            continue;
        }
        if (!name) {
            return { ok: false, error: "Each line item needs a name" };
        }
        const amount = Number(amountText);
        if (!Number.isFinite(amount) || amount === 0) {
            return {
                ok: false,
                error: "Each line item needs a non-zero amount",
            };
        }
        parsed.push({ name, amount });
    }

    return { ok: true, value: parsed };
}

export function VoucherAdhocEditor({
    payrollId,
    voucherId,
    adhoc,
    readOnly = false,
}: Props) {
    const router = useRouter();
    const committedRows = useMemo(() => toDraftRows(adhoc), [adhoc]);
    const [rows, setRows] = useState<DraftRow[]>(committedRows);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        setRows(committedRows);
    }, [committedRows]);

    const commit = (nextRows: DraftRow[] = rows) => {
        if (readOnly || isPending) {
            return;
        }
        if (rowsEqual(nextRows, committedRows)) {
            return;
        }

        const parsed = parseRowsForCommit(nextRows);
        if (!parsed.ok) {
            setError(parsed.error);
            return;
        }

        setError(null);
        startTransition(async () => {
            const res = await updateVoucherAdhoc({
                payrollId,
                voucherId,
                adhoc: parsed.value,
            });
            if (
                res &&
                typeof res === "object" &&
                "error" in res &&
                typeof res.error === "string"
            ) {
                setError(res.error);
                return;
            }
            router.refresh();
        });
    };

    const addRow = () => {
        if (readOnly) return;
        setRows((current) => [...current, { name: "", amount: "" }]);
    };

    const removeRow = (index: number) => {
        if (readOnly) return;
        const nextRows = rows.filter((_, rowIndex) => rowIndex !== index);
        setRows(nextRows);
        commit(nextRows);
    };

    const updateRow = (index: number, field: keyof DraftRow, value: string) => {
        if (readOnly) return;
        setRows((current) =>
            current.map((row, rowIndex) =>
                rowIndex === index ? { ...row, [field]: value } : row,
            ),
        );
    };

    return (
        <Card className="border bg-muted/10 gap-2 py-3">
            <CardHeader className="px-4 pb-0">
                <div className="flex items-center gap-3">
                    <CardTitle className="text-sm font-semibold">
                        Adhoc Line Items (Negative amount for deductions)
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pt-1">
                {rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {readOnly
                            ? "No adhoc line items."
                            : "Add adjustments that apply after subtotal, CPF, and advances."}
                    </p>
                ) : (
                    <div className="space-y-2">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_8rem_auto] sm:items-center">
                            <p className="text-sm text-muted-foreground">
                                Description
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Amount
                            </p>
                            <span className="sr-only">Actions</span>
                        </div>
                        {rows.map((row, index) => (
                            <div
                                key={`adhoc-row-${index}`}
                                className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_8rem_auto] sm:items-center">
                                <Input
                                    aria-label={`Adhoc line item ${index + 1} description`}
                                    value={row.name}
                                    readOnly={readOnly}
                                    disabled={readOnly || isPending}
                                    className="h-8 text-sm"
                                    onChange={(event) =>
                                        updateRow(
                                            index,
                                            "name",
                                            event.currentTarget.value,
                                        )
                                    }
                                    onBlur={() => commit()}
                                />
                                <div className="relative">
                                    <span
                                        className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                                        aria-hidden>
                                        $
                                    </span>
                                    <Input
                                        aria-label={`Adhoc line item ${index + 1} amount`}
                                        inputMode="decimal"
                                        value={row.amount}
                                        readOnly={readOnly}
                                        disabled={readOnly || isPending}
                                        className="h-8 pl-5 text-sm tabular-nums"
                                        onChange={(event) =>
                                            updateRow(
                                                index,
                                                "amount",
                                                event.currentTarget.value,
                                            )
                                        }
                                        onBlur={() => commit()}
                                    />
                                </div>
                                {!readOnly ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                                        disabled={isPending}
                                        aria-label={`Remove adhoc line item ${index + 1}`}
                                        onClick={() => removeRow(index)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                ) : (
                                    <span aria-hidden />
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex items-center gap-3">
                    {!readOnly ? (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            onClick={addRow}>
                            <Plus className="h-4 w-4" />
                            Add line item
                        </Button>
                    ) : null}
                    {isPending ? (
                        <span className="text-xs text-muted-foreground">
                            Saving…
                        </span>
                    ) : null}
                </div>

                {error ? (
                    <p className={cn("text-xs text-red-600")}>{error}</p>
                ) : null}
            </CardContent>
        </Card>
    );
}
