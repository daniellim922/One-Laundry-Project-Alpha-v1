"use client";

import { Layer, useXAxisScale, useYAxisScale } from "recharts";

/** Short month labels (index 0 → January), shared by stacked payroll dashboards. */
export const MONTH_SHORT = [
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

/** Default tick style for stacked bar X/Y axes */
export const STACKED_AXIS_TICK = { fontSize: 12 } as const;

/** CSS variable palette cycling for stacked series */
export const STACKED_BAR_CHART_COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
] as const;

export type StackedMonthTotalsRow = {
    month: string;
    monthTotal: number;
};

export function StackedBarMonthTotalLabels<T extends StackedMonthTotalsRow>({
    data,
    formatValue,
}: {
    data: T[];
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
