"use client";

import * as React from "react";
import { Cell, Label, Pie, PieChart } from "recharts";

import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart";

export type DonutSegment = {
    /** Stable key for theme CSS variable (e.g. active, draft) */
    key: string;
    value: number;
    /** Legend / tooltip label */
    label: string;
};

export function SimpleDonutChart({
    segments,
    centerLabel,
}: {
    segments: DonutSegment[];
    centerLabel?: string;
}) {
    const chartConfig = React.useMemo(() => {
        const cfg: ChartConfig = {};
        const colors = [
            "var(--chart-1)",
            "var(--chart-2)",
            "var(--chart-3)",
            "var(--chart-4)",
            "var(--chart-5)",
        ];
        segments.forEach((s, i) => {
            cfg[s.key] = {
                label: s.label,
                color: colors[i % colors.length],
            };
        });
        return cfg;
    }, [segments]);

    const data = segments.map((s) => ({
        name: s.key,
        value: s.value,
        fill: `var(--color-${s.key})`,
    }));

    const total = segments.reduce((acc, s) => acc + s.value, 0);

    return (
        <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[260px]">
            <PieChart>
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    strokeWidth={2}>
                    {data.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                    ))}
                    <Label
                        content={({ viewBox }) => {
                            if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                return (
                                    <text
                                        x={viewBox.cx}
                                        y={viewBox.cy}
                                        textAnchor="middle"
                                        dominantBaseline="middle">
                                        <tspan
                                            x={viewBox.cx}
                                            y={viewBox.cy}
                                            className="fill-foreground text-2xl font-bold">
                                            {total}
                                        </tspan>
                                        <tspan
                                            x={viewBox.cx}
                                            y={(viewBox.cy ?? 0) + 18}
                                            className="fill-muted-foreground text-xs">
                                            {centerLabel ?? "total"}
                                        </tspan>
                                    </text>
                                );
                            }
                            return null;
                        }}
                    />
                </Pie>
            </PieChart>
        </ChartContainer>
    );
}
