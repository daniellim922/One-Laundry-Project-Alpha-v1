"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const currencyFmt = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

function formatMoney(value: number): string {
    return currencyFmt.format(value);
}

export type SelectableWorkerMetricRow = {
    id: string;
    name: string;
    amount: number;
};

type Props = {
    title: string;
    description: string;
    rows: SelectableWorkerMetricRow[];
    searchPlaceholder?: string;
};

function rowsKey(rows: SelectableWorkerMetricRow[]): string {
    return rows
        .map((r) => r.id)
        .sort()
        .join("\0");
}

export function SelectableWorkerMetricCard({
    title,
    description,
    rows,
    searchPlaceholder = "Worker name",
}: Props) {
    const [nameFilter, setNameFilter] = useState("");
    const [checked, setChecked] = useState<Record<string, boolean>>({});

    const rowIdsKey = useMemo(() => rowsKey(rows), [rows]);
    const rowsRef = useRef(rows);
    useLayoutEffect(() => {
        rowsRef.current = rows;
    }, [rows]);

    useEffect(() => {
        setChecked(
            Object.fromEntries(
                rowsRef.current.map((r) => [r.id, true] as const),
            ),
        );
    }, [rowIdsKey]);

    const visibleRows = useMemo(() => {
        const q = nameFilter.trim().toLowerCase();
        if (q === "") {
            return rows;
        }
        return rows.filter((r) => r.name.toLowerCase().includes(q));
    }, [rows, nameFilter]);

    const total = useMemo(
        () =>
            visibleRows.reduce(
                (acc, r) => ((checked[r.id] ?? true) ? acc + r.amount : acc),
                0,
            ),
        [visibleRows, checked],
    );

    const setRowChecked = (id: string, value: boolean) => {
        setChecked((prev) => ({ ...prev, [id]: value }));
    };

    return (
        <Card>
            <CardHeader className="space-y-4 pb-2">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <CardTitle className="text-lg font-semibold tracking-tight sm:text-xl">
                        {title}
                    </CardTitle>
                    <div className="w-full min-w-0 sm:max-w-sm">
                        <Input
                            value={nameFilter}
                            onChange={(e) => setNameFilter(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="min-w-0"
                            type="search"
                            aria-label="Filter workers by name"
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-6 md:flex-row md:items-stretch">
                    <div
                        className={cn(
                            "w-max min-w-0 max-w-full shrink-0 2xl:w-56",
                            "h-48 space-y-3.5 overflow-y-auto pr-1 md:h-64",
                        )}>
                        {rows.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                No active workers in this group.
                            </p>
                        ) : visibleRows.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                No workers match this search.
                            </p>
                        ) : (
                            visibleRows.map((r) => (
                                <div
                                    key={r.id}
                                    className="flex w-max max-w-full min-w-0 items-center gap-3.5">
                                    <Checkbox
                                        className="size-5"
                                        id={`metric-${r.id}`}
                                        checked={checked[r.id] ?? true}
                                        onCheckedChange={(v) =>
                                            setRowChecked(r.id, v === true)
                                        }
                                    />
                                    <Label
                                        htmlFor={`metric-${r.id}`}
                                        className="cursor-pointer text-base font-normal whitespace-nowrap">
                                        {r.name}
                                    </Label>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col items-center justify-center border-t pt-4 text-center md:min-w-[10rem] md:border-l md:border-t-0 md:pl-6 md:pt-0">
                        <div className="text-4xl font-bold tabular-nums sm:text-5xl lg:text-6xl">
                            ${formatMoney(total)}
                        </div>
                        <p className="text-muted-foreground mt-2 max-w-prose text-base sm:text-lg">
                            {description}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
