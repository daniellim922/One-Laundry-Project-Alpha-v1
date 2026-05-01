"use client";

import * as React from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    XAxis,
    YAxis,
} from "recharts";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
    MonthMultiSelectFilter,
    allMonthsSet,
} from "@/components/dashboard/month-multi-select-filter";
import {
    PAYROLL_CHART_CATEGORY_KEYS,
    type MonthlyPayrollCategoryMonthRow,
    type PayrollChartCategoryKey,
} from "@/types/monthly-payroll-category-aggregates";

import {
    formatStackedChartCurrency,
    formatStackedChartYAxisTick,
} from "@/components/dashboard/monthly-worker-stacked-amount-overview-card";
import {
    MONTH_SHORT,
    STACKED_AXIS_TICK,
    STACKED_BAR_CHART_COLORS,
    StackedBarMonthTotalLabels,
    type StackedMonthTotalsRow,
} from "@/components/dashboard/stacked-month-bar-chart";

const CATEGORY_LABEL: Record<PayrollChartCategoryKey, string> = {
    ptForeignSubtotal: "Sub Total paid to PT foreign workers",
    ftForeignSubtotal: "Subtotal paid to FT foreign workers",
    namedWorkersSubtotal: "Subtotal paid to Alvis Ong and Ong Chong Wee",
    ftLocalCpf: "CPF paid to FT local worker",
};

function categorySeriesKey(k: PayrollChartCategoryKey): string {
    return `c_${k}`;
}

function categoryIsIncluded(
    checked: Record<PayrollChartCategoryKey, boolean>,
    k: PayrollChartCategoryKey,
): boolean {
    return checked[k] !== false;
}

type MonthChartPoint = StackedMonthTotalsRow & {
    [seriesKey: string]: string | number;
};

const EMPTY_ROW: Pick<
    MonthlyPayrollCategoryMonthRow,
    | "ptForeignSubtotal"
    | "ftForeignSubtotal"
    | "namedWorkersSubtotal"
    | "ftLocalCpf"
> = {
    ptForeignSubtotal: 0,
    ftForeignSubtotal: 0,
    namedWorkersSubtotal: 0,
    ftLocalCpf: 0,
};

export function MonthlyPayrollCategoryStackedOverviewCard({
    rows,
    defaultYear,
    yearOptions,
    title,
    description,
    idPrefix,
    stackId,
}: {
    rows: MonthlyPayrollCategoryMonthRow[];
    defaultYear: number;
    yearOptions: number[];
    title: string;
    description: string;
    idPrefix: string;
    stackId: string;
}) {
    const yAxisW = 70;
    const [selectedYear, setSelectedYear] = React.useState(defaultYear);
    const [selectedMonths, setSelectedMonths] = React.useState(() =>
        allMonthsSet(),
    );
    const [checked, setChecked] = React.useState<
        Record<PayrollChartCategoryKey, boolean>
    >(
        () =>
            Object.fromEntries(
                PAYROLL_CHART_CATEGORY_KEYS.map((k) => [k, true] as const),
            ) as Record<PayrollChartCategoryKey, boolean>,
    );

    const hasYearData = React.useMemo(() => {
        return rows.some((r) => r.year === selectedYear);
    }, [rows, selectedYear]);

    const amountsByMonth = React.useMemo(() => {
        const m = new Map<number, typeof EMPTY_ROW>();
        for (const r of rows) {
            if (r.year !== selectedYear) continue;
            m.set(r.month, {
                ptForeignSubtotal: r.ptForeignSubtotal,
                ftForeignSubtotal: r.ftForeignSubtotal,
                namedWorkersSubtotal: r.namedWorkersSubtotal,
                ftLocalCpf: r.ftLocalCpf,
            });
        }
        return m;
    }, [rows, selectedYear]);

    /** Full stacked total per month (all categories), so the Y axis does not rescale when checkboxes change. */
    const yAxisDomainUpper = React.useMemo(() => {
        let max = 0;
        for (const monthNum of selectedMonths) {
            const amounts = amountsByMonth.get(monthNum) ?? EMPTY_ROW;
            const total = PAYROLL_CHART_CATEGORY_KEYS.reduce(
                (sum, k) => sum + amounts[k],
                0,
            );
            if (total > max) {
                max = total;
            }
        }
        if (max <= 0) {
            return 1;
        }
        return Math.max(1, Math.ceil(max * 1.08));
    }, [amountsByMonth, selectedMonths]);

    const enabledCategories = React.useMemo(
        () =>
            PAYROLL_CHART_CATEGORY_KEYS.filter((k) =>
                categoryIsIncluded(checked, k),
            ),
        [checked],
    );

    const chartData = React.useMemo((): MonthChartPoint[] => {
        return MONTH_SHORT.map((label, i) => {
            const monthNum = i + 1;
            const amounts = amountsByMonth.get(monthNum) ?? EMPTY_ROW;
            let monthTotal = 0;
            const point: MonthChartPoint = {
                month: label,
                monthTotal: 0,
            };
            for (const k of PAYROLL_CHART_CATEGORY_KEYS) {
                if (!categoryIsIncluded(checked, k)) {
                    point[categorySeriesKey(k)] = 0;
                    continue;
                }
                const val = amounts[k];
                point[categorySeriesKey(k)] = val;
                monthTotal += val;
            }
            point.monthTotal = monthTotal;
            return point;
        }).filter((_, i) => selectedMonths.has(i + 1));
    }, [amountsByMonth, checked, selectedMonths]);

    const chartConfig = React.useMemo(() => {
        const cfg: ChartConfig = {};
        PAYROLL_CHART_CATEGORY_KEYS.forEach((k, i) => {
            cfg[categorySeriesKey(k)] = {
                label: CATEGORY_LABEL[k],
                color: STACKED_BAR_CHART_COLORS[i % STACKED_BAR_CHART_COLORS.length],
            };
        });
        return cfg;
    }, []);

    const setRowChecked = (k: PayrollChartCategoryKey, value: boolean) => {
        setChecked((prev) => ({ ...prev, [k]: value }));
    };

    const chartEmptyReason = React.useMemo(() => {
        if (!hasYearData) return "year" as const;
        if (selectedMonths.size === 0) return "months" as const;
        if (enabledCategories.length === 0) return "selection" as const;
        return null;
    }, [hasYearData, selectedMonths.size, enabledCategories.length]);

    return (
        <Card className="h-[min(88vh,56rem)] min-h-144 max-h-[90vh]">
            <CardHeader className="shrink-0 space-y-4 pb-2">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <CardTitle className="text-lg font-semibold tracking-tight sm:text-xl">
                            {title}
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
                        </div>
                    </div>
                </div>
                <CardDescription>{description}</CardDescription>
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
                            Categories
                        </p>
                        <div
                            className={cn(
                                "mt-2 flex min-h-48 flex-1 basis-0 flex-col gap-5 overflow-y-auto border-t pt-3 pr-1 md:min-h-0",
                            )}>
                            <div className="space-y-3.5">
                                {PAYROLL_CHART_CATEGORY_KEYS.map((k) => (
                                    <div
                                        key={k}
                                        className="flex w-max max-w-full min-w-0 items-start gap-3.5">
                                        <Checkbox
                                            className="mt-0.5 size-5 shrink-0"
                                            id={`${idPrefix}-${k}`}
                                            checked={categoryIsIncluded(
                                                checked,
                                                k,
                                            )}
                                            onCheckedChange={(v) =>
                                                setRowChecked(k, v === true)
                                            }
                                        />
                                        <Label
                                            htmlFor={`${idPrefix}-${k}`}
                                            className="cursor-pointer text-base font-normal leading-snug">
                                            {CATEGORY_LABEL[k]}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col justify-center border-t pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
                        {chartEmptyReason === "year" ? (
                            <div className="text-muted-foreground flex h-[95%] min-h-48 shrink-0 items-center justify-center self-stretch rounded-md border border-dashed text-center text-sm">
                                No Settled payroll amounts for this year.
                            </div>
                        ) : chartEmptyReason === "months" ? (
                            <div className="text-muted-foreground flex h-[95%] min-h-48 shrink-0 items-center justify-center self-stretch rounded-md border border-dashed text-center text-sm">
                                Select at least one month to see the chart.
                            </div>
                        ) : chartEmptyReason === "selection" ? (
                            <div className="text-muted-foreground flex h-[95%] min-h-48 shrink-0 items-center justify-center self-stretch rounded-md border border-dashed text-center text-sm">
                                Select at least one category to see the chart.
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
                                        tick={STACKED_AXIS_TICK}
                                        tickMargin={8}
                                    />
                                    <YAxis
                                        domain={[0, yAxisDomainUpper]}
                                        tickLine={false}
                                        axisLine={false}
                                        width={yAxisW}
                                        tick={STACKED_AXIS_TICK}
                                        tickFormatter={(v) =>
                                            typeof v === "number"
                                                ? formatStackedChartYAxisTick(v)
                                                : String(v)
                                        }
                                    />
                                    <ChartTooltip
                                        content={<ChartTooltipContent />}
                                    />
                                    {enabledCategories.map((k, idx) => (
                                        <Bar
                                            key={k}
                                            dataKey={categorySeriesKey(k)}
                                            stackId={stackId}
                                            isAnimationActive
                                            animationDuration={300}
                                            animationEasing="ease-in-out"
                                            fill={`var(--color-${categorySeriesKey(k)})`}
                                            radius={
                                                idx ===
                                                enabledCategories.length - 1
                                                    ? [4, 4, 0, 0]
                                                    : [0, 0, 0, 0]
                                            }
                                        />
                                    ))}
                                    <StackedBarMonthTotalLabels
                                        data={chartData}
                                        formatValue={formatStackedChartCurrency}
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
