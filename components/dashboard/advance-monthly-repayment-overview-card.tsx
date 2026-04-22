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

import type { AdvanceMonthlyRepaymentAggregateRow } from "@/types/advance-monthly-repayment-aggregates";

type WorkerMeta = {
    id: string;
    name: string;
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

function formatCurrencyCompact(n: number): string {
    return `$${currencyCompactFmt.format(n)}`;
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

function StackedBarMonthTotalLabels({ data }: { data: MonthChartPoint[] }) {
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
                if (x == null || y == null || !Number.isFinite(x) || !Number.isFinite(y)) {
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
                        {formatCurrencyCompact(row.monthTotal)}
                    </text>
                );
            })}
        </Layer>
    );
}

export function AdvanceMonthlyRepaymentOverviewCard({
    rows,
    defaultYear,
    yearOptions,
}: {
    rows: AdvanceMonthlyRepaymentAggregateRow[];
    defaultYear: number;
    yearOptions: number[];
}) {
    const [selectedYear, setSelectedYear] = React.useState(defaultYear);
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
                });
            }
        }
        return m;
    }, [rows, selectedYear]);

    const workersList = React.useMemo(() => {
        return Array.from(workersInYearMeta.values()).sort((a, b) =>
            a.name.localeCompare(b.name),
        );
    }, [workersInYearMeta]);

    const workerIdsKey = React.useMemo(() => workersKey(workersList), [workersList]);

    const workersRef = React.useRef(workersList);
    React.useLayoutEffect(() => {
        workersRef.current = workersList;
    }, [workersList]);

    React.useEffect(() => {
        setChecked(
            Object.fromEntries(workersRef.current.map((w) => [w.id, true] as const)),
        );
    }, [workerIdsKey]);

    const normalizedFilter = nameFilter.trim().toLowerCase();

    const visibleWorkersForList = React.useMemo(() => {
        if (!normalizedFilter) {
            return workersList;
        }
        return workersList.filter((w) =>
            w.name.toLowerCase().includes(normalizedFilter),
        );
    }, [workersList, normalizedFilter]);

    const chartWorkers = React.useMemo(() => {
        return workersList.filter((w) => {
            if (!(checked[w.id] ?? true)) {
                return false;
            }
            if (!normalizedFilter) {
                return true;
            }
            return w.name.toLowerCase().includes(normalizedFilter);
        });
    }, [workersList, checked, normalizedFilter]);

    const amountByWorkerMonth = React.useMemo(() => {
        const map = new Map<string, number>();
        for (const r of rows) {
            if (r.year !== selectedYear) continue;
            const k = `${r.workerId}-${r.month}`;
            map.set(k, (map.get(k) ?? 0) + r.totalAmount);
        }
        return map;
    }, [rows, selectedYear]);

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
                const amt = amountByWorkerMonth.get(`${w.id}-${month}`) ?? 0;
                point[key] = amt;
                monthTotal += amt;
            }
            point.monthTotal = monthTotal;
            return point;
        });
    }, [chartWorkers, amountByWorkerMonth]);

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
        if (visibleWorkersForList.length === 0) {
            return "search" as const;
        }
        return null;
    }, [workersInYearMeta.size, visibleWorkersForList.length]);

    const chartEmptyReason = React.useMemo(() => {
        if (workersInYearMeta.size === 0) return "year" as const;
        if (chartWorkers.length === 0) return "selection" as const;
        return null;
    }, [workersInYearMeta.size, chartWorkers.length]);

    return (
        <Card className="h-[min(88vh,56rem)] min-h-144 max-h-[90vh]">
            <CardHeader className="shrink-0 space-y-4 pb-2">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        <CardTitle className="text-lg font-semibold tracking-tight sm:text-xl">
                            Monthly advance repayments
                        </CardTitle>
                        <Select
                            value={String(selectedYear)}
                            onValueChange={(v) => setSelectedYear(Number(v))}>
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
                    </div>
                    <div className="w-full min-w-0 lg:max-w-sm">
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
                <CardDescription>
                    Repayment-term installment amounts (advance rows) with
                    repayment in each month, stacked by worker. Not request
                    totals. Only workers with a repayment in the selected year
                    are listed.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div
                    className={cn(
                        "flex min-h-0 flex-1 flex-col gap-6 md:flex-row md:items-stretch",
                    )}>
                    <div
                        className={cn(
                            "flex w-full max-w-full shrink-0 flex-col md:h-full md:max-h-full md:w-56 2xl:w-80",
                        )}>
                        <p className="text-muted-foreground shrink-0 text-sm font-medium">
                            Workers
                        </p>
                        <div
                            className={cn(
                                "mt-3 h-56 shrink-0 space-y-3.5 overflow-y-auto border-t pt-3 pr-1 md:mt-4 md:h-96",
                            )}>
                            {listEmptyReason === "year" ? (
                                <p className="text-muted-foreground text-sm">
                                    No advance repayments for this year.
                                </p>
                            ) : listEmptyReason === "search" ? (
                                <p className="text-muted-foreground text-sm">
                                    No workers match this search.
                                </p>
                            ) : (
                                visibleWorkersForList.map((w) => (
                                    <div
                                        key={w.id}
                                        className="flex w-max max-w-full min-w-0 items-center gap-3.5">
                                        <Checkbox
                                            className="size-5"
                                            id={`advance-rp-${w.id}`}
                                            checked={checked[w.id] ?? true}
                                            onCheckedChange={(v) =>
                                                setRowChecked(w.id, v === true)
                                            }
                                        />
                                        <Label
                                            htmlFor={`advance-rp-${w.id}`}
                                            className="cursor-pointer text-base font-normal whitespace-nowrap">
                                            {w.name}
                                        </Label>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col justify-center border-t pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
                        {chartEmptyReason === "year" ? (
                            <div className="text-muted-foreground flex h-[95%] min-h-48 shrink-0 items-center justify-center self-stretch rounded-md border border-dashed text-center text-sm">
                                No repayments to chart for this year.
                            </div>
                        ) : chartEmptyReason === "selection" ? (
                            <div className="text-muted-foreground flex h-[95%] min-h-48 shrink-0 items-center justify-center self-stretch rounded-md border border-dashed text-center text-sm">
                                Select workers or adjust search to see the
                                chart.
                            </div>
                        ) : (
                            <ChartContainer
                                config={chartConfig}
                                className="aspect-auto h-[95%] min-h-48 w-full min-w-0 shrink-0 self-stretch [&_[data-slot=chart]]:h-full">
                                <BarChart
                                    accessibilityLayer
                                    data={chartData}
                                    margin={{
                                        top: 36,
                                        right: 8,
                                        left: 0,
                                        bottom: 0,
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
                                        tickLine={false}
                                        axisLine={false}
                                        width={52}
                                        tick={AXIS_TICK}
                                        tickFormatter={(v) =>
                                            typeof v === "number"
                                                ? formatCurrencyCompact(v)
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
                                            stackId="repayment"
                                            isAnimationActive={false}
                                            fill={`var(--color-${workerSeriesKey(w.id)})`}
                                            radius={
                                                i === chartWorkers.length - 1
                                                    ? [4, 4, 0, 0]
                                                    : [0, 0, 0, 0]
                                            }
                                        />
                                    ))}
                                    <StackedBarMonthTotalLabels data={chartData} />
                                </BarChart>
                            </ChartContainer>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
