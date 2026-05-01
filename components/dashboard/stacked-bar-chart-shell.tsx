"use client";

import * as React from "react";
import {
    BarChart,
    CartesianGrid,
    XAxis,
    YAxis,
} from "recharts";

import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart";
import {
    STACKED_AXIS_TICK,
    StackedBarMonthTotalLabels,
    type StackedMonthTotalsRow,
} from "@/components/dashboard/stacked-month-bar-chart";

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

export function StackedBarChartPanel<T extends StackedMonthTotalsRow>({
    chartConfig,
    chartData,
    yAxisDomainUpper,
    yAxisWidth,
    tickFormatter,
    formatMonthTotal,
    barLayers,
}: {
    chartConfig: ChartConfig;
    chartData: T[];
    yAxisDomainUpper: number;
    yAxisWidth: number;
    tickFormatter: (v: number) => string;
    formatMonthTotal: (n: number) => string;
    barLayers: React.ReactNode;
}) {
    return (
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
                    width={yAxisWidth}
                    tick={STACKED_AXIS_TICK}
                    tickFormatter={(v) =>
                        typeof v === "number" ? tickFormatter(v) : String(v)
                    }
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                {barLayers}
                <StackedBarMonthTotalLabels
                    data={chartData}
                    formatValue={formatMonthTotal}
                />
            </BarChart>
        </ChartContainer>
    );
}
