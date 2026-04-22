"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { Clock } from "lucide-react";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart";

export type MinimumHoursBarBucket = {
    hours: number;
    workerCount: number;
};

function formatHoursLabel(n: number): string {
    return `${n.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })} hrs`;
}

function barKey(hours: number): string {
    return `h${String(hours).replace(/\./g, "_")}`;
}

export function MinimumWorkingHoursBarCard({
    buckets,
}: {
    buckets: MinimumHoursBarBucket[];
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
        buckets.forEach((b, i) => {
            const key = barKey(b.hours);
            cfg[key] = {
                label: formatHoursLabel(b.hours),
                color: colors[i % colors.length],
            };
        });
        return cfg;
    }, [buckets]);

    const data = buckets.map((b) => {
        const key = barKey(b.hours);
        return {
            key,
            label: formatHoursLabel(b.hours),
            workerCount: b.workerCount,
            fill: `var(--color-${key})`,
        };
    });

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Minimum working hours
                </CardTitle>
                <Clock className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent className="space-y-3">
                <CardDescription>
                    Active Full Time Foreign Workers
                </CardDescription>
                {data.length === 0 ? (
                    <div className="text-muted-foreground flex h-[160px] items-center justify-center rounded-md border border-dashed text-center text-sm">
                        No active workers have minimum working hours set
                    </div>
                ) : (
                    <ChartContainer
                        config={chartConfig}
                        className="aspect-auto h-[200px] w-full">
                        <BarChart
                            accessibilityLayer
                            data={data}
                            margin={{
                                top: 8,
                                right: 8,
                                left: 0,
                                bottom: 0,
                            }}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="label"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                            />
                            <YAxis
                                allowDecimals={false}
                                tickLine={false}
                                axisLine={false}
                                width={32}
                            />
                            <ChartTooltip
                                cursor={false}
                                content={
                                    <ChartTooltipContent
                                        nameKey="key"
                                        hideLabel
                                    />
                                }
                            />
                            <Bar
                                dataKey="workerCount"
                                radius={[6, 6, 0, 0]}>
                                {data.map((entry) => (
                                    <Cell
                                        key={entry.key}
                                        fill={entry.fill}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}
