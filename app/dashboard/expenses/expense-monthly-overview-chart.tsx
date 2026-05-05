"use client";

import * as React from "react";
import { Bar } from "recharts";

import { EnumBulkSelect } from "@/components/dashboard/enum-bulk-select";
import {
    MonthMultiSelectFilter,
    allMonthsSet,
} from "@/components/dashboard/month-multi-select-filter";
import {
    MONTH_SHORT,
    STACKED_BAR_CHART_COLORS,
    type StackedMonthTotalsRow,
} from "@/components/dashboard/stacked-month-bar-chart";
import {
    formatStackedChartCurrency,
    StackedBarChartPanel,
} from "@/components/dashboard/stacked-bar-chart-shell";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import type { MonthlySupplierAmountRow } from "@/types/monthly-supplier-amount-aggregates";

type AmountMetric = "grandTotal" | "subTotal";

type SupplierEntity = {
    id: string;
    supplierName: string;
    categoryName: string;
    subcategoryName: string;
};

export type ExpenseMonthlyOverviewCopy = {
    title: string;
    description: string;
    emptyListYear: string;
    emptyListSearch: string;
    emptyListCategory: string;
    emptyChartYear: string;
    emptyChartAllDeselected: string;
    emptyChartMonths: string;
    emptyChartSelection: string;
    idPrefix: string;
};

/** Stable id for one supplier line item (supplier can repeat under different categories). */
function compoundExpenseEntryId(parts: {
    categoryName: string;
    subcategoryName: string;
    supplierName: string;
}): string {
    return `${parts.categoryName}\0${parts.subcategoryName}\0${parts.supplierName}`;
}

function encodeStableChartKey(segment: string): string {
    const bytes = new TextEncoder().encode(segment);
    if (bytes.length === 0) {
        return "e_e";
    }
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]!);
    }
    return `e_${btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}

function idsKey(ids: string[]): string {
    return [...ids].sort().join("\0");
}

function entryIsIncludedInChart(
    checked: Record<string, boolean>,
    id: string,
): boolean {
    return checked[id] !== false;
}

type MonthChartPoint = StackedMonthTotalsRow & {
    [seriesKey: string]: string | number;
};

export function ExpenseMonthlyOverviewChart({
    rows,
    defaultYear,
    yearOptions,
    copy,
}: {
    rows: MonthlySupplierAmountRow[];
    defaultYear: number;
    yearOptions: number[];
    copy: ExpenseMonthlyOverviewCopy;
}) {
    const yAxisW = 70;
    const [amountMetric, setAmountMetric] =
        React.useState<AmountMetric>("grandTotal");
    const rechartsStackId =
        amountMetric === "grandTotal" ? "grandTotal" : "subTotal";

    const getValue = React.useCallback(
        (r: MonthlySupplierAmountRow) =>
            amountMetric === "grandTotal"
                ? r.grandTotalAmount
                : r.subTotalAmount,
        [amountMetric],
    );

    const [selectedYear, setSelectedYear] = React.useState(defaultYear);
    const [selectedMonths, setSelectedMonths] = React.useState(() =>
        allMonthsSet(),
    );
    const [nameFilter, setNameFilter] = React.useState("");
    const [checked, setChecked] = React.useState<Record<string, boolean>>({});

    const allSuppliersInYear = React.useMemo((): SupplierEntity[] => {
        const byId = new Map<string, SupplierEntity>();
        for (const r of rows) {
            if (r.year !== selectedYear) continue;
            const id = compoundExpenseEntryId(r);
            if (!byId.has(id)) {
                byId.set(id, {
                    id,
                    supplierName: r.supplierName,
                    categoryName: r.categoryName,
                    subcategoryName: r.subcategoryName,
                });
            }
        }
        return Array.from(byId.values());
    }, [rows, selectedYear]);

    const categoryEnumValues = React.useMemo(() => {
        const s = new Set<string>();
        for (const e of allSuppliersInYear) {
            s.add(e.categoryName);
        }
        return [...s].sort((a, b) => a.localeCompare(b));
    }, [allSuppliersInYear]);

    const subcategoryEnumValues = React.useMemo(() => {
        const s = new Set<string>();
        for (const e of allSuppliersInYear) {
            s.add(e.subcategoryName);
        }
        return [...s].sort((a, b) => a.localeCompare(b));
    }, [allSuppliersInYear]);

    const entitiesRef = React.useRef(allSuppliersInYear);
    React.useLayoutEffect(() => {
        entitiesRef.current = allSuppliersInYear;
    }, [allSuppliersInYear]);

    const entryIdsKey = React.useMemo(
        () => idsKey(allSuppliersInYear.map((e) => e.id)),
        [allSuppliersInYear],
    );

    React.useEffect(() => {
        setChecked(
            Object.fromEntries(
                entitiesRef.current.map((e) => [e.id, true] as const),
            ),
        );
    }, [entryIdsKey]);

    const normalizedFilter = nameFilter.trim().toLowerCase();

    const setCategoryAllChecked = React.useCallback(
        (category: string, value: boolean) => {
            setChecked((prev) => {
                const next = { ...prev };
                for (const e of entitiesRef.current) {
                    if (e.categoryName === category) {
                        next[e.id] = value;
                    }
                }
                return next;
            });
        },
        [],
    );

    const setSubcategoryAllChecked = React.useCallback(
        (subcategory: string, value: boolean) => {
            setChecked((prev) => {
                const next = { ...prev };
                for (const e of entitiesRef.current) {
                    if (e.subcategoryName === subcategory) {
                        next[e.id] = value;
                    }
                }
                return next;
            });
        },
        [],
    );

    const groupedSections = React.useMemo(() => {
        const encodedPairs = [
            ...new Set(
                allSuppliersInYear.map((e) =>
                    JSON.stringify([e.categoryName, e.subcategoryName] as const),
                ),
            ),
        ].sort((a, b) => a.localeCompare(b));

        type Section = { header: string; suppliers: SupplierEntity[] };
        const sections: Section[] = [];
        for (const encoded of encodedPairs) {
            const [categoryName, subcategoryName] = JSON.parse(encoded) as [
                string,
                string,
            ];
            const inGroup = allSuppliersInYear.filter(
                (e) =>
                    e.categoryName === categoryName &&
                    e.subcategoryName === subcategoryName,
            );
            const visibleBySearch = normalizedFilter
                ? inGroup.filter((e) =>
                      e.supplierName
                          .toLowerCase()
                          .includes(normalizedFilter),
                  )
                : inGroup;
            if (visibleBySearch.length === 0) continue;
            sections.push({
                header: `${categoryName} — ${subcategoryName}`,
                suppliers: [...visibleBySearch].sort((a, b) =>
                    a.supplierName.localeCompare(b.supplierName),
                ),
            });
        }
        return sections;
    }, [allSuppliersInYear, normalizedFilter]);

    const chartEntries = React.useMemo(() => {
        return allSuppliersInYear.filter((e) => {
            if (!entryIsIncludedInChart(checked, e.id)) return false;
            if (!normalizedFilter) return true;
            return e.supplierName.toLowerCase().includes(normalizedFilter);
        });
    }, [allSuppliersInYear, checked, normalizedFilter]);

    const valueByEntryMonth = React.useMemo(() => {
        const map = new Map<string, number>();
        for (const r of rows) {
            if (r.year !== selectedYear) continue;
            const id = compoundExpenseEntryId(r);
            const k = `${id}\n${r.month}`;
            map.set(k, (map.get(k) ?? 0) + getValue(r));
        }
        return map;
    }, [rows, selectedYear, getValue]);

    const entitiesInScopeForYAxis = React.useMemo(() => {
        if (!normalizedFilter) return allSuppliersInYear;
        return allSuppliersInYear.filter((e) =>
            e.supplierName.toLowerCase().includes(normalizedFilter),
        );
    }, [allSuppliersInYear, normalizedFilter]);

    const yAxisDomainUpper = React.useMemo(() => {
        let max = 0;
        for (const monthNum of selectedMonths) {
            let monthSum = 0;
            for (const e of entitiesInScopeForYAxis) {
                monthSum += valueByEntryMonth.get(`${e.id}\n${monthNum}`) ?? 0;
            }
            if (monthSum > max) max = monthSum;
        }
        if (max <= 0) return 1;
        return Math.max(1, Math.ceil(max * 1.08));
    }, [valueByEntryMonth, selectedMonths, entitiesInScopeForYAxis]);

    const chartData = React.useMemo((): MonthChartPoint[] => {
        return MONTH_SHORT.map((label, i) => {
            const month = i + 1;
            let monthTotal = 0;
            const point: MonthChartPoint = {
                month: label,
                monthTotal: 0,
            };
            for (const e of chartEntries) {
                const key = encodeStableChartKey(e.id);
                const val = valueByEntryMonth.get(`${e.id}\n${month}`) ?? 0;
                point[key] = val;
                monthTotal += val;
            }
            point.monthTotal = monthTotal;
            return point;
        }).filter((_, i) => selectedMonths.has(i + 1));
    }, [chartEntries, valueByEntryMonth, selectedMonths]);

    const chartConfig = React.useMemo(() => {
        const cfg: ChartConfig = {};
        chartEntries.forEach((e, i) => {
            const key = encodeStableChartKey(e.id);
            cfg[key] = {
                label: `${e.supplierName} (${e.categoryName} — ${e.subcategoryName})`,
                color:
                    STACKED_BAR_CHART_COLORS[i % STACKED_BAR_CHART_COLORS.length],
            };
        });
        return cfg;
    }, [chartEntries]);

    const setRowChecked = (id: string, value: boolean) => {
        setChecked((prev) => ({ ...prev, [id]: value }));
    };

    const listEmptyReason = React.useMemo(() => {
        if (allSuppliersInYear.length === 0) return "year" as const;
        if (groupedSections.length === 0) {
            return normalizedFilter
                ? ("search" as const)
                : ("category" as const);
        }
        return null;
    }, [
        allSuppliersInYear.length,
        groupedSections.length,
        normalizedFilter,
    ]);

    const chartEmptyReason = React.useMemo(() => {
        if (allSuppliersInYear.length === 0) return "year" as const;
        if (selectedMonths.size === 0) return "months" as const;
        if (chartEntries.length === 0) {
            const allDeselected =
                allSuppliersInYear.length > 0 &&
                allSuppliersInYear.every((e) => checked[e.id] === false);
            if (allDeselected) return "deselected" as const;
            return "selection" as const;
        }
        return null;
    }, [
        allSuppliersInYear,
        selectedMonths.size,
        chartEntries.length,
        checked,
    ]);

    const bulkSelectDisabled = allSuppliersInYear.length === 0;

    return (
        <Card className="h-[min(88vh,56rem)] min-h-144 max-h-[90vh]">
            <CardHeader className="shrink-0 space-y-4 pb-2">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <CardTitle className="text-lg font-semibold tracking-tight sm:text-xl">
                            {copy.title}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-2">
                            <Select
                                value={String(selectedYear)}
                                onValueChange={(v) => {
                                    setSelectedYear(Number(v));
                                    setSelectedMonths(allMonthsSet());
                                }}>
                                <SelectTrigger
                                    className="w-34"
                                    aria-label="Filter by calendar year">
                                    <SelectValue placeholder="Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {yearOptions.map((y) => (
                                        <SelectItem key={y} value={String(y)}>
                                            {y}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <MonthMultiSelectFilter
                                selected={selectedMonths}
                                onChange={setSelectedMonths}
                            />
                            {categoryEnumValues.length > 0 ? (
                                <EnumBulkSelect
                                    allWorkers={allSuppliersInYear}
                                    checked={checked}
                                    enumValues={categoryEnumValues}
                                    getWorkerValue={(w) => w.categoryName}
                                    allSelectedLabel="All categories"
                                    searchPlaceholder="Search categories…"
                                    emptyMessage="No category found."
                                    ariaLabel="Bulk select suppliers by expense category"
                                    triggerClassName="h-9 min-w-36 max-w-56 justify-between px-3 py-2 font-normal shadow-xs"
                                    onBulkChange={setCategoryAllChecked}
                                    disabled={bulkSelectDisabled}
                                />
                            ) : null}
                            {subcategoryEnumValues.length > 0 ? (
                                <EnumBulkSelect
                                    allWorkers={allSuppliersInYear}
                                    checked={checked}
                                    enumValues={subcategoryEnumValues}
                                    getWorkerValue={(w) => w.subcategoryName}
                                    allSelectedLabel="All subcategories"
                                    searchPlaceholder="Search subcategories…"
                                    emptyMessage="No subcategory found."
                                    ariaLabel="Bulk select suppliers by expense subcategory"
                                    triggerClassName="h-9 min-w-36 max-w-56 justify-between px-3 py-2 font-normal shadow-xs"
                                    onBulkChange={setSubcategoryAllChecked}
                                    disabled={bulkSelectDisabled}
                                />
                            ) : null}
                            <Select
                                value={amountMetric}
                                onValueChange={(v) => {
                                    setAmountMetric(v as AmountMetric);
                                }}>
                                <SelectTrigger
                                    className="w-40"
                                    aria-label="Amount basis for chart">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="grandTotal">
                                        Grand Total
                                    </SelectItem>
                                    <SelectItem value="subTotal">
                                        Subtotal
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="w-full min-w-0 shrink-0 lg:max-w-sm">
                        <Input
                            value={nameFilter}
                            onChange={(e) => setNameFilter(e.target.value)}
                            placeholder="Supplier name"
                            className="min-w-0"
                            type="search"
                            aria-label="Filter suppliers by name"
                        />
                    </div>
                </div>
                <CardDescription>{copy.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div
                    className={cn(
                        "flex min-h-0 flex-1 flex-col gap-6 md:flex-row md:items-stretch",
                    )}>
                    <div
                        className={cn(
                            "flex h-full min-h-0 w-full max-w-full shrink-0 flex-col overflow-hidden md:max-h-full md:w-56 2xl:w-96",
                        )}>
                        <p className="text-muted-foreground shrink-0 text-sm font-medium">
                            Suppliers
                        </p>
                        <div
                            className={cn(
                                "mt-2 flex min-h-48 flex-1 basis-0 flex-col gap-5 overflow-y-auto border-t pt-3 pr-1 md:min-h-0",
                            )}>
                            {listEmptyReason === "year" ? (
                                <p className="text-muted-foreground text-sm">
                                    {copy.emptyListYear}
                                </p>
                            ) : listEmptyReason === "search" ? (
                                <p className="text-muted-foreground text-sm">
                                    {copy.emptyListSearch}
                                </p>
                            ) : listEmptyReason === "category" ? (
                                <p className="text-muted-foreground text-sm">
                                    {copy.emptyListCategory}
                                </p>
                            ) : (
                                groupedSections.map((section) => (
                                    <div
                                        key={section.header}
                                        className="space-y-2.5">
                                        <p className="text-muted-foreground text-sm font-medium">
                                            {section.header}
                                        </p>
                                        <div className="space-y-3.5">
                                            {section.suppliers.map((e) => (
                                                <div
                                                    key={e.id}
                                                    className="flex w-max max-w-full min-w-0 items-center gap-3.5">
                                                    <Checkbox
                                                        className="size-5 shrink-0"
                                                        id={`${copy.idPrefix}-${encodeStableChartKey(e.id)}`}
                                                        checked={entryIsIncludedInChart(
                                                            checked,
                                                            e.id,
                                                        )}
                                                        onCheckedChange={(v) =>
                                                            setRowChecked(
                                                                e.id,
                                                                v === true,
                                                            )
                                                        }
                                                    />
                                                    <Label
                                                        htmlFor={`${copy.idPrefix}-${encodeStableChartKey(e.id)}`}
                                                        className="cursor-pointer text-base font-normal break-words">
                                                        {e.supplierName}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col justify-center border-t pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
                        {chartEmptyReason === "year" ? (
                            <div className="text-muted-foreground flex h-[95%] min-h-48 shrink-0 items-center justify-center self-stretch rounded-md border border-dashed text-center text-sm">
                                {copy.emptyChartYear}
                            </div>
                        ) : chartEmptyReason === "deselected" ? (
                            <div className="text-muted-foreground flex h-[95%] min-h-48 shrink-0 items-center justify-center self-stretch rounded-md border border-dashed text-center text-sm">
                                {copy.emptyChartAllDeselected}
                            </div>
                        ) : chartEmptyReason === "months" ? (
                            <div className="text-muted-foreground flex h-[95%] min-h-48 shrink-0 items-center justify-center self-stretch rounded-md border border-dashed text-center text-sm">
                                {copy.emptyChartMonths}
                            </div>
                        ) : chartEmptyReason === "selection" ? (
                            <div className="text-muted-foreground flex h-[95%] min-h-48 shrink-0 items-center justify-center self-stretch rounded-md border border-dashed text-center text-sm">
                                {copy.emptyChartSelection}
                            </div>
                        ) : (
                            <StackedBarChartPanel
                                chartConfig={chartConfig}
                                chartData={chartData}
                                yAxisDomainUpper={yAxisDomainUpper}
                                yAxisWidth={yAxisW}
                                tickFormatter={(v) =>
                                    formatStackedChartCurrency(Math.ceil(v))
                                }
                                formatMonthTotal={formatStackedChartCurrency}
                                barLayers={
                                    <>
                                        {chartEntries.map((e, i) => (
                                            <Bar
                                                key={e.id}
                                                dataKey={encodeStableChartKey(
                                                    e.id,
                                                )}
                                                stackId={rechartsStackId}
                                                isAnimationActive
                                                animationDuration={300}
                                                animationEasing="ease-in-out"
                                                fill={`var(--color-${encodeStableChartKey(e.id)})`}
                                                radius={
                                                    i ===
                                                    chartEntries.length - 1
                                                        ? [4, 4, 0, 0]
                                                        : [0, 0, 0, 0]
                                                }
                                            />
                                        ))}
                                    </>
                                }
                            />
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
