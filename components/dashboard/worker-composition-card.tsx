"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

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
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart";
import {
    WORKER_EMPLOYMENT_ARRANGEMENTS,
    WORKER_EMPLOYMENT_TYPES,
    type WorkerEmploymentArrangement,
    type WorkerEmploymentType,
} from "@/types/status";

export type WorkerCompositionBucket = {
    type: WorkerEmploymentType;
    arrangement: WorkerEmploymentArrangement;
    count: number;
};

type ComboKey =
    | "ft-foreign"
    | "ft-local"
    | "pt-foreign"
    | "pt-local";

function comboKey(
    type: WorkerEmploymentType,
    arrangement: WorkerEmploymentArrangement,
): ComboKey {
    const t = type === "Full Time" ? "ft" : "pt";
    const a = arrangement === "Foreign Worker" ? "foreign" : "local";
    return `${t}-${a}` as ComboKey;
}

const SHORT_LABEL: Record<ComboKey, string> = {
    "ft-foreign": "FT · Foreign",
    "ft-local": "FT · Local",
    "pt-foreign": "PT · Foreign",
    "pt-local": "PT · Local",
};

const FULL_LABEL: Record<ComboKey, string> = {
    "ft-foreign": "Full Time · Foreign Worker",
    "ft-local": "Full Time · Local Worker",
    "pt-foreign": "Part Time · Foreign Worker",
    "pt-local": "Part Time · Local Worker",
};

const chartConfig: ChartConfig = {
    "ft-foreign": { label: FULL_LABEL["ft-foreign"], color: "var(--chart-1)" },
    "ft-local": { label: FULL_LABEL["ft-local"], color: "var(--chart-2)" },
    "pt-foreign": { label: FULL_LABEL["pt-foreign"], color: "var(--chart-3)" },
    "pt-local": { label: FULL_LABEL["pt-local"], color: "var(--chart-4)" },
};

export function WorkerCompositionCard({
    buckets,
}: {
    buckets: WorkerCompositionBucket[];
}) {
    const [types, setTypes] = React.useState<Set<WorkerEmploymentType>>(
        () => new Set(WORKER_EMPLOYMENT_TYPES),
    );
    const [arrangements, setArrangements] = React.useState<
        Set<WorkerEmploymentArrangement>
    >(() => new Set(WORKER_EMPLOYMENT_ARRANGEMENTS));

    const toggleType = (t: WorkerEmploymentType, checked: boolean) => {
        setTypes((prev) => {
            const next = new Set(prev);
            if (checked) next.add(t);
            else next.delete(t);
            return next;
        });
    };

    const toggleArrangement = (
        a: WorkerEmploymentArrangement,
        checked: boolean,
    ) => {
        setArrangements((prev) => {
            const next = new Set(prev);
            if (checked) next.add(a);
            else next.delete(a);
            return next;
        });
    };

    const visible = buckets.filter(
        (b) => types.has(b.type) && arrangements.has(b.arrangement),
    );

    const data = visible.map((b) => {
        const key = comboKey(b.type, b.arrangement);
        return {
            key,
            label: SHORT_LABEL[key],
            count: b.count,
            fill: `var(--color-${key})`,
        };
    });

    const filteredTotal = visible.reduce((acc, b) => acc + b.count, 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Workforce composition</CardTitle>
                <CardDescription>
                    Active workers by employment type and arrangement
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-6 md:grid-cols-[220px_1fr]">
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <p className="text-sm font-medium">
                                Employment type
                            </p>
                            <div className="space-y-2">
                                {WORKER_EMPLOYMENT_TYPES.map((t) => {
                                    const id = `worker-comp-type-${t}`;
                                    return (
                                        <div
                                            key={t}
                                            className="flex items-center gap-2">
                                            <Checkbox
                                                id={id}
                                                checked={types.has(t)}
                                                onCheckedChange={(v) =>
                                                    toggleType(t, v === true)
                                                }
                                            />
                                            <Label
                                                htmlFor={id}
                                                className="text-sm font-normal">
                                                {t}
                                            </Label>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <p className="text-sm font-medium">Arrangement</p>
                            <div className="space-y-2">
                                {WORKER_EMPLOYMENT_ARRANGEMENTS.map((a) => {
                                    const id = `worker-comp-arr-${a}`;
                                    return (
                                        <div
                                            key={a}
                                            className="flex items-center gap-2">
                                            <Checkbox
                                                id={id}
                                                checked={arrangements.has(a)}
                                                onCheckedChange={(v) =>
                                                    toggleArrangement(
                                                        a,
                                                        v === true,
                                                    )
                                                }
                                            />
                                            <Label
                                                htmlFor={id}
                                                className="text-sm font-normal">
                                                {a}
                                            </Label>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <p className="text-muted-foreground text-xs">
                                Active workers (filtered)
                            </p>
                            <p className="text-3xl font-bold">
                                {filteredTotal}
                            </p>
                        </div>

                        {data.length === 0 ? (
                            <div className="text-muted-foreground flex h-[220px] items-center justify-center rounded-md border border-dashed text-sm">
                                No buckets match the selected filters
                            </div>
                        ) : (
                            <ChartContainer
                                config={chartConfig}
                                className="aspect-auto h-[260px] w-full">
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
                                        dataKey="count"
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
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
