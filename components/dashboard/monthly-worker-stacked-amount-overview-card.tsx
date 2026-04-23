"use client";

import * as React from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Layer,
    XAxis,
    YAxis,
    useXAxisScale,
    useYAxisScale,
} from "recharts";

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
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { EmploymentArrangementBulkSelect } from "@/components/dashboard/employment-arrangement-bulk-select";
import { EmploymentTypeBulkSelect } from "@/components/dashboard/employment-type-bulk-select";
import {
    MonthMultiSelectFilter,
    allMonthsSet,
} from "@/components/dashboard/month-multi-select-filter";
import {
    WORKER_EMPLOYMENT_ARRANGEMENTS,
    WORKER_EMPLOYMENT_TYPES,
    type WorkerEmploymentArrangement,
    type WorkerEmploymentType,
} from "@/types/status";

import type { MonthlyWorkerAmountRow } from "@/types/monthly-worker-amount-aggregates";

/** Shared shape for monthly per-worker series rows (amount, hours, etc.). */
export type MonthlyWorkerStackedChartRow = {
    workerId: string;
    workerName: string;
    employmentType: WorkerEmploymentType;
    employmentArrangement: WorkerEmploymentArrangement;
    year: number;
    month: number;
};

export type MonthlyWorkerStackedAmountCopy = {
    title: string;
    description: string;
    emptyListYear: string;
    emptyListEmployment: string;
    emptyListSearch: string;
    emptyChartYear: string;
    emptyChartEmployment: string;
    emptyChartMonths: string;
    emptyChartSelection: string;
    /** Prefix for checkbox `id` / label `htmlFor` (unique per card on a page). */
    idPrefix: string;
    /** Recharts `Bar` `stackId` — must differ if multiple charts mount together. */
    stackId: string;
    /** Axis labels, bar totals, and Y-axis ticks. */
    formatValue: (n: number) => string;
    /** Default 52. Use a smaller value for compact scales (e.g. hours). */
    yAxisWidth?: number;
};

export function getStackedRowGrandTotalAmount(
    r: MonthlyWorkerAmountRow,
): number {
    return r.grandTotalAmount;
}

export function getStackedRowSubTotalAmount(r: MonthlyWorkerAmountRow): number {
    return r.subTotalAmount;
}

export type StackedAmountMetric = "grandTotal" | "subTotal";

type WorkerMeta = {
    id: string;
    name: string;
    employmentType: WorkerEmploymentType;
    employmentArrangement: WorkerEmploymentArrangement;
};

function workerIsIncludedInChart(
    checked: Record<string, boolean>,
    id: string,
): boolean {
    return checked[id] !== false;
}

type ComboKey = "ft-foreign" | "ft-local" | "pt-foreign" | "pt-local";

function comboKey(
    type: WorkerEmploymentType,
    arrangement: WorkerEmploymentArrangement,
): ComboKey {
    const t = type === "Full Time" ? "ft" : "pt";
    const a = arrangement === "Foreign Worker" ? "foreign" : "local";
    return `${t}-${a}` as ComboKey;
}

const SHORT_GROUP_LABEL: Record<ComboKey, string> = {
    "ft-foreign": "FT · Foreign",
    "ft-local": "FT · Local",
    "pt-foreign": "PT · Foreign",
    "pt-local": "PT · Local",
};

const MONTH_SHORT = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
] as const;

const AXIS_TICK = { fontSize: 12 } as const;

const CHART_COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
] as const;

const currencyCompactFmt = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

export function formatStackedChartCurrency(n: number): string {
    return `$${currencyCompactFmt.format(n)}`;
}

/** Y-axis ticks: whole dollars, rounded up (no fractional display). */
export function formatStackedChartYAxisTick(n: number): string {
    return formatStackedChartCurrency(Math.ceil(n));
}

function workerSeriesKey(workerId: string): string {
    return `w_${workerId}`;
}

function workersKey(workers: WorkerMeta[]): string {
    return workers
        .map((w) => w.id)
        .sort()
        .join("\0");
}

type MonthChartPoint = {
    month: string;
    monthTotal: number;
    [workerSeriesKey: string]: string | number;
};

function StackedBarMonthTotalLabels({
    data,
    formatValue,
}: {
    data: MonthChartPoint[];
    formatValue: (n: number) => string;
}) {
    const xScale = useXAxisScale(0);
    const yScale = useYAxisScale(0);
    if (!xScale || !yScale) {
        return null;
    }
    return (
        <Layer className="recharts-month-total-labels">
            {data.map((row) => {
                if (row.monthTotal <= 0) {
                    return null;
                }
                const x = xScale(row.month, { position: "middle" });
                const y = yScale(row.monthTotal);
                if (
                    x == null ||
                    y == null ||
                    !Number.isFinite(x) ||
                    !Number.isFinite(y)
                ) {
                    return null;
                }
                return (
                    <text
                        key={row.month}
                        x={x}
                        y={y - 8}
                        textAnchor="middle"
                        fill="currentColor"
                        className="text-foreground text-xs font-medium tabular-nums">
                        {formatValue(row.monthTotal)}
                    </text>
                );
            })}
        </Layer>
    );
}

export function MonthlyWorkerStackedAmountOverviewCard<
    T extends MonthlyWorkerStackedChartRow,
>({
    rows,
    getValue,
    defaultYear,
    yearOptions,
    copy,
    amountMetricControl,
    chartStackId,
}: {
    rows: T[];
    getValue: (row: T) => number;
    defaultYear: number;
    yearOptions: number[];
    copy: MonthlyWorkerStackedAmountCopy;
    /** When set, shows Grand Total vs Subtotal beside other filters (payroll). */
    amountMetricControl?: {
        value: StackedAmountMetric;
        onChange: (m: StackedAmountMetric) => void;
    };
    /** Optional override for Recharts `stackId` when the metric changes (e.g. subTotal). */
    chartStackId?: string;
}) {
    const yAxisW = copy.yAxisWidth ?? 70;
    const rechartsStackId = chartStackId ?? copy.stackId;
    const [selectedYear, setSelectedYear] = React.useState(defaultYear);
    const [selectedMonths, setSelectedMonths] = React.useState(() =>
        allMonthsSet(),
    );
    const [nameFilter, setNameFilter] = React.useState("");
    const [checked, setChecked] = React.useState<Record<string, boolean>>({});

    const workersInYearMeta = React.useMemo(() => {
        const m = new Map<string, WorkerMeta>();
        for (const r of rows) {
            if (r.year !== selectedYear) continue;
            if (!m.has(r.workerId)) {
                m.set(r.workerId, {
                    id: r.workerId,
                    name: r.workerName,
                    employmentType: r.employmentType,
                    employmentArrangement: r.employmentArrangement,
                });
            }
        }
        return m;
    }, [rows, selectedYear]);

    const allWorkersInYear = React.useMemo(
        () => Array.from(workersInYearMeta.values()),
        [workersInYearMeta],
    );

    const setEmploymentTypeAllChecked = React.useCallback(
        (t: WorkerEmploymentType, value: boolean) => {
            setChecked((prev) => {
                const next = { ...prev };
                for (const w of allWorkersInYear) {
                    if (w.employmentType === t) {
                        next[w.id] = value;
                    }
                }
                return next;
            });
        },
        [allWorkersInYear],
    );

    const setArrangementAllChecked = React.useCallback(
        (a: WorkerEmploymentArrangement, value: boolean) => {
            setChecked((prev) => {
                const next = { ...prev };
                for (const w of allWorkersInYear) {
                    if (w.employmentArrangement === a) {
                        next[w.id] = value;
                    }
                }
                return next;
            });
        },
        [allWorkersInYear],
    );

    const workerIdsKey = React.useMemo(
        () => workersKey(allWorkersInYear),
        [allWorkersInYear],
    );

    const workersRef = React.useRef(allWorkersInYear);
    React.useLayoutEffect(() => {
        workersRef.current = allWorkersInYear;
    }, [allWorkersInYear]);

    React.useEffect(() => {
        setChecked(
            Object.fromEntries(
                workersRef.current.map((w) => [w.id, true] as const),
            ),
        );
    }, [workerIdsKey]);

    const normalizedFilter = nameFilter.trim().toLowerCase();

    const groupedSections = React.useMemo(() => {
        const sections: { header: string; workers: WorkerMeta[] }[] = [];
        for (const type of WORKER_EMPLOYMENT_TYPES) {
            for (const arrangement of WORKER_EMPLOYMENT_ARRANGEMENTS) {
                const inGroup = allWorkersInYear.filter(
                    (w) =>
                        w.employmentType === type &&
                        w.employmentArrangement === arrangement,
                );
                const visible = !normalizedFilter
                    ? inGroup
                    : inGroup.filter((w) =>
                          w.name.toLowerCase().includes(normalizedFilter),
                      );
                if (visible.length === 0) continue;
                sections.push({
                    header: SHORT_GROUP_LABEL[comboKey(type, arrangement)],
                    workers: [...visible].sort((a, b) =>
                        a.name.localeCompare(b.name),
                    ),
                });
            }
        }
        return sections;
    }, [allWorkersInYear, normalizedFilter]);

    const chartWorkers = React.useMemo(() => {
        return allWorkersInYear.filter((w) => {
            if (!workerIsIncludedInChart(checked, w.id)) {
                return false;
            }
            if (!normalizedFilter) {
                return true;
            }
            return w.name.toLowerCase().includes(normalizedFilter);
        });
    }, [allWorkersInYear, checked, normalizedFilter]);

    const valueByWorkerMonth = React.useMemo(() => {
        const map = new Map<string, number>();
        for (const r of rows) {
            if (r.year !== selectedYear) continue;
            const k = `${r.workerId}-${r.month}`;
            map.set(k, (map.get(k) ?? 0) + getValue(r));
        }
        return map;
    }, [rows, selectedYear, getValue]);

    /** Workers matching the name search only (ignore checkbox state) — full-stack max per month for Y scale. */
    const workersInScopeForYAxis = React.useMemo(() => {
        if (!normalizedFilter) {
            return allWorkersInYear;
        }
        return allWorkersInYear.filter((w) =>
            w.name.toLowerCase().includes(normalizedFilter),
        );
    }, [allWorkersInYear, normalizedFilter]);

    const yAxisDomainUpper = React.useMemo(() => {
        let max = 0;
        for (const monthNum of selectedMonths) {
            let monthSum = 0;
            for (const w of workersInScopeForYAxis) {
                monthSum += valueByWorkerMonth.get(`${w.id}-${monthNum}`) ?? 0;
            }
            if (monthSum > max) {
                max = monthSum;
            }
        }
        if (max <= 0) {
            return 1;
        }
        return Math.max(1, Math.ceil(max * 1.08));
    }, [valueByWorkerMonth, selectedMonths, workersInScopeForYAxis]);

    const chartData = React.useMemo((): MonthChartPoint[] => {
        return MONTH_SHORT.map((label, i) => {
            const month = i + 1;
            let monthTotal = 0;
            const point: MonthChartPoint = {
                month: label,
                monthTotal: 0,
            };
            for (const w of chartWorkers) {
                const key = workerSeriesKey(w.id);
                const val = valueByWorkerMonth.get(`${w.id}-${month}`) ?? 0;
                point[key] = val;
                monthTotal += val;
            }
            point.monthTotal = monthTotal;
            return point;
        }).filter((_, i) => selectedMonths.has(i + 1));
    }, [chartWorkers, valueByWorkerMonth, selectedMonths]);

    const chartConfig = React.useMemo(() => {
        const cfg: ChartConfig = {};
        chartWorkers.forEach((w, i) => {
            const key = workerSeriesKey(w.id);
            cfg[key] = {
                label: w.name,
                color: CHART_COLORS[i % CHART_COLORS.length],
            };
        });
        return cfg;
    }, [chartWorkers]);

    const setRowChecked = (id: string, value: boolean) => {
        setChecked((prev) => ({ ...prev, [id]: value }));
    };

    const listEmptyReason = React.useMemo(() => {
        if (workersInYearMeta.size === 0) {
            return "year" as const;
        }
        if (groupedSections.length === 0) {
            return "search" as const;
        }
        return null;
    }, [workersInYearMeta.size, groupedSections.length]);

    const chartEmptyReason = React.useMemo(() => {
        if (workersInYearMeta.size === 0) return "year" as const;
        if (selectedMonths.size === 0) return "months" as const;
        if (chartWorkers.length === 0) {
            const allDeselected =
                allWorkersInYear.length > 0 &&
                allWorkersInYear.every((w) => checked[w.id] === false);
            if (allDeselected) {
                return "employment" as const;
            }
            return "selection" as const;
        }
        return null;
    }, [
        workersInYearMeta.size,
        allWorkersInYear,
        selectedMonths.size,
        chartWorkers.length,
        checked,
    ]);

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
                            <EmploymentTypeBulkSelect
                                allWorkers={allWorkersInYear}
                                checked={checked}
                                onTypeBulkChange={setEmploymentTypeAllChecked}
                            />
                            <EmploymentArrangementBulkSelect
                                allWorkers={allWorkersInYear}
                                checked={checked}
                                onArrangementBulkChange={
                                    setArrangementAllChecked
                                }
                            />
                            {amountMetricControl ? (
                                <Select
                                    value={amountMetricControl.value}
                                    onValueChange={(v) => {
                                        amountMetricControl.onChange(
                                            v as StackedAmountMetric,
                                        );
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
                            ) : null}
                        </div>
                    </div>
                    <div className="w-full min-w-0 shrink-0 lg:max-w-sm">
                        <Input
                            value={nameFilter}
                            onChange={(e) => setNameFilter(e.target.value)}
                            placeholder="Worker name"
                            className="min-w-0"
                            type="search"
                            aria-label="Filter workers by name"
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
                            "flex h-full min-h-0 w-full max-w-full shrink-0 flex-col overflow-hidden md:max-h-full md:w-56 2xl:w-80",
                        )}>
                        <p className="text-muted-foreground shrink-0 text-sm font-medium">
                            Workers
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
                            ) : (
                                groupedSections.map((section) => (
                                    <div
                                        key={section.header}
                                        className="space-y-2.5">
                                        <p className="text-muted-foreground text-sm font-medium">
                                            {section.header}
                                        </p>
                                        <div className="space-y-3.5">
                                            {section.workers.map((w) => (
                                                <div
                                                    key={w.id}
                                                    className="flex w-max max-w-full min-w-0 items-center gap-3.5">
                                                    <Checkbox
                                                        className="size-5"
                                                        id={`${copy.idPrefix}-${w.id}`}
                                                        checked={workerIsIncludedInChart(
                                                            checked,
                                                            w.id,
                                                        )}
                                                        onCheckedChange={(v) =>
                                                            setRowChecked(
                                                                w.id,
                                                                v === true,
                                                            )
                                                        }
                                                    />
                                                    <Label
                                                        htmlFor={`${copy.idPrefix}-${w.id}`}
                                                        className="cursor-pointer text-base font-normal whitespace-nowrap">
                                                        {w.name}
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
                        ) : chartEmptyReason === "employment" ? (
                            <div className="text-muted-foreground flex h-[95%] min-h-48 shrink-0 items-center justify-center self-stretch rounded-md border border-dashed text-center text-sm">
                                {copy.emptyChartEmployment}
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
                            <ChartContainer
                                config={chartConfig}
                                className="aspect-auto h-[95%] min-h-48 w-full min-w-0 shrink-0 self-stretch **:data-[slot=chart]:h-full">
                                <BarChart
                                    accessibilityLayer
                                    data={chartData}
                                    margin={{
                                        top: 44,
                                        right: 20,
                                        left: 4,
                                        bottom: 8,
                                    }}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis
                                        dataKey="month"
                                        tickLine={false}
                                        axisLine={false}
                                        tick={AXIS_TICK}
                                        tickMargin={8}
                                    />
                                    <YAxis
                                        domain={[0, yAxisDomainUpper]}
                                        tickLine={false}
                                        axisLine={false}
                                        width={yAxisW}
                                        tick={AXIS_TICK}
                                        tickFormatter={(v) =>
                                            typeof v === "number"
                                                ? copy.formatValue(Math.ceil(v))
                                                : String(v)
                                        }
                                    />
                                    <ChartTooltip
                                        content={<ChartTooltipContent />}
                                    />
                                    {chartWorkers.map((w, i) => (
                                        <Bar
                                            key={w.id}
                                            dataKey={workerSeriesKey(w.id)}
                                            stackId={rechartsStackId}
                                            isAnimationActive
                                            animationDuration={300}
                                            animationEasing="ease-in-out"
                                            fill={`var(--color-${workerSeriesKey(w.id)})`}
                                            radius={
                                                i === chartWorkers.length - 1
                                                    ? [4, 4, 0, 0]
                                                    : [0, 0, 0, 0]
                                            }
                                        />
                                    ))}
                                    <StackedBarMonthTotalLabels
                                        data={chartData}
                                        formatValue={copy.formatValue}
                                    />
                                </BarChart>
                            </ChartContainer>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
