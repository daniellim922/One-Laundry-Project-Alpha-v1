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
import {
    WORKER_EMPLOYMENT_ARRANGEMENTS,
    WORKER_EMPLOYMENT_TYPES,
    type WorkerEmploymentArrangement,
    type WorkerEmploymentType,
} from "@/types/status";

export type TimesheetMonthlyHoursOverviewRow = {
    workerId: string;
    workerName: string;
    employmentType: WorkerEmploymentType;
    employmentArrangement: WorkerEmploymentArrangement;
    year: number;
    month: number;
    totalHours: number;
};

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

type WorkerMeta = {
    id: string;
    name: string;
    employmentType: WorkerEmploymentType;
    employmentArrangement: WorkerEmploymentArrangement;
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

function workerSeriesKey(workerId: string): string {
    return `w_${workerId}`;
}

function workersKey(workers: WorkerMeta[]): string {
    return workers
        .map((w) => w.id)
        .sort()
        .join("\0");
}

function formatHoursCompact(n: number): string {
    return `${n.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
    })} h`;
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
                        {formatHoursCompact(row.monthTotal)}
                    </text>
                );
            })}
        </Layer>
    );
}

export function TimesheetMonthlyHoursOverviewCard({
    rows,
    defaultYear,
    yearOptions,
}: {
    rows: TimesheetMonthlyHoursOverviewRow[];
    defaultYear: number;
    yearOptions: number[];
}) {
    const [selectedYear, setSelectedYear] = React.useState(defaultYear);
    const [nameFilter, setNameFilter] = React.useState("");
    const [checked, setChecked] = React.useState<Record<string, boolean>>({});
    const [selectedEmploymentTypes, setSelectedEmploymentTypes] =
        React.useState<Set<WorkerEmploymentType>>(
            () => new Set(WORKER_EMPLOYMENT_TYPES),
        );
    const [selectedArrangements, setSelectedArrangements] = React.useState<
        Set<WorkerEmploymentArrangement>
    >(() => new Set(WORKER_EMPLOYMENT_ARRANGEMENTS));

    const toggleEmploymentType = (t: WorkerEmploymentType, next: boolean) => {
        setSelectedEmploymentTypes((prev) => {
            const s = new Set(prev);
            if (next) s.add(t);
            else s.delete(t);
            return s;
        });
    };

    const toggleArrangement = (
        a: WorkerEmploymentArrangement,
        next: boolean,
    ) => {
        setSelectedArrangements((prev) => {
            const s = new Set(prev);
            if (next) s.add(a);
            else s.delete(a);
            return s;
        });
    };

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

    const workersAfterEmploymentFilter = React.useMemo(() => {
        return Array.from(workersInYearMeta.values()).filter(
            (w) =>
                selectedEmploymentTypes.has(w.employmentType) &&
                selectedArrangements.has(w.employmentArrangement),
        );
    }, [workersInYearMeta, selectedEmploymentTypes, selectedArrangements]);

    const workerIdsKey = React.useMemo(
        () => workersKey(workersAfterEmploymentFilter),
        [workersAfterEmploymentFilter],
    );

    const workersRef = React.useRef(workersAfterEmploymentFilter);
    React.useLayoutEffect(() => {
        workersRef.current = workersAfterEmploymentFilter;
    }, [workersAfterEmploymentFilter]);

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
                if (
                    !selectedEmploymentTypes.has(type) ||
                    !selectedArrangements.has(arrangement)
                ) {
                    continue;
                }
                const inGroup = workersAfterEmploymentFilter.filter(
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
    }, [
        workersAfterEmploymentFilter,
        selectedEmploymentTypes,
        selectedArrangements,
        normalizedFilter,
    ]);

    const chartWorkers = React.useMemo(() => {
        return workersAfterEmploymentFilter.filter((w) => {
            if (!(checked[w.id] ?? true)) {
                return false;
            }
            if (!normalizedFilter) {
                return true;
            }
            return w.name.toLowerCase().includes(normalizedFilter);
        });
    }, [workersAfterEmploymentFilter, checked, normalizedFilter]);

    const hoursByWorkerMonth = React.useMemo(() => {
        const map = new Map<string, number>();
        for (const r of rows) {
            if (r.year !== selectedYear) continue;
            const k = `${r.workerId}-${r.month}`;
            map.set(k, (map.get(k) ?? 0) + r.totalHours);
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
                const hours = hoursByWorkerMonth.get(`${w.id}-${month}`) ?? 0;
                point[key] = hours;
                monthTotal += hours;
            }
            point.monthTotal = monthTotal;
            return point;
        });
    }, [chartWorkers, hoursByWorkerMonth]);

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
        if (workersAfterEmploymentFilter.length === 0) {
            return "employment" as const;
        }
        if (groupedSections.length === 0) {
            return "search" as const;
        }
        return null;
    }, [
        workersInYearMeta.size,
        workersAfterEmploymentFilter.length,
        groupedSections.length,
    ]);

    const chartEmptyReason = React.useMemo(() => {
        if (workersInYearMeta.size === 0) return "year" as const;
        if (workersAfterEmploymentFilter.length === 0) {
            return "employment" as const;
        }
        if (chartWorkers.length === 0) return "selection" as const;
        return null;
    }, [
        workersInYearMeta.size,
        workersAfterEmploymentFilter.length,
        chartWorkers.length,
    ]);

    return (
        <Card className="h-[min(88vh,56rem)] min-h-144 max-h-[90vh]">
            <CardHeader className="shrink-0 space-y-4 pb-2">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        <CardTitle className="text-lg font-semibold tracking-tight sm:text-xl">
                            Monthly working hours
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
                    Total hours per month from timesheet entries (clock-in
                    date), stacked by worker. Filter by employment type and
                    arrangement; only workers with timesheet rows in the
                    selected year are listed.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div
                    className={cn(
                        "flex min-h-0 flex-1 flex-col gap-6 md:flex-row md:items-stretch",
                    )}>
                    <div
                        className={cn(
                            "flex min-h-0 w-full max-w-full shrink-0 flex-col md:h-full md:max-h-full md:overflow-hidden md:w-56 2xl:w-80",
                        )}>
                        <div className="space-y-6 shrink-0">
                            <div className="space-y-3">
                                <p className="text-sm font-medium">
                                    Employment type
                                </p>
                                <div className="space-y-2">
                                    {WORKER_EMPLOYMENT_TYPES.map((t) => {
                                        const id = `timesheet-hrs-type-${t}`;
                                        return (
                                            <div
                                                key={t}
                                                className="flex items-center gap-2">
                                                <Checkbox
                                                    id={id}
                                                    checked={selectedEmploymentTypes.has(
                                                        t,
                                                    )}
                                                    onCheckedChange={(v) =>
                                                        toggleEmploymentType(
                                                            t,
                                                            v === true,
                                                        )
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
                                <p className="text-sm font-medium">
                                    Arrangement
                                </p>
                                <div className="space-y-2">
                                    {WORKER_EMPLOYMENT_ARRANGEMENTS.map((a) => {
                                        const id = `timesheet-hrs-arr-${a}`;
                                        return (
                                            <div
                                                key={a}
                                                className="flex items-center gap-2">
                                                <Checkbox
                                                    id={id}
                                                    checked={selectedArrangements.has(
                                                        a,
                                                    )}
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
                        <div
                            className={cn(
                                "mt-4 flex min-h-48 flex-1 basis-0 flex-col gap-5 overflow-y-auto border-t pt-4 pr-1 md:min-h-0",
                            )}>
                            {listEmptyReason === "year" ? (
                                <p className="text-muted-foreground text-sm">
                                    No timesheet data for this year.
                                </p>
                            ) : listEmptyReason === "employment" ? (
                                <p className="text-muted-foreground text-sm">
                                    No workers match the selected employment
                                    filters.
                                </p>
                            ) : listEmptyReason === "search" ? (
                                <p className="text-muted-foreground text-sm">
                                    No workers match this search.
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
                                                        id={`timesheet-hrs-${w.id}`}
                                                        checked={
                                                            checked[w.id] ??
                                                            true
                                                        }
                                                        onCheckedChange={(v) =>
                                                            setRowChecked(
                                                                w.id,
                                                                v === true,
                                                            )
                                                        }
                                                    />
                                                    <Label
                                                        htmlFor={`timesheet-hrs-${w.id}`}
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
                                No hours to chart for this year.
                            </div>
                        ) : chartEmptyReason === "employment" ? (
                            <div className="text-muted-foreground flex h-[95%] min-h-48 shrink-0 items-center justify-center self-stretch rounded-md border border-dashed text-center text-sm">
                                No hours to chart for the selected employment
                                filters.
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
                                        width={44}
                                        tick={AXIS_TICK}
                                        tickFormatter={(v) =>
                                            typeof v === "number"
                                                ? `${v}`
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
                                            stackId="hours"
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
