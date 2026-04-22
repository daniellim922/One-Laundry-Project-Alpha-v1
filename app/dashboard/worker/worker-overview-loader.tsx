import { and, asc, count, eq, max, min } from "drizzle-orm";

import { db } from "@/lib/db";
import { workerTable } from "@/db/tables/workerTable";
import { employmentTable } from "@/db/tables/employmentTable";
import { DashboardQuickActionsCard } from "@/components/dashboard/dashboard-quick-actions-card";
import { FullTimeMonthlyPayCard } from "@/components/dashboard/full-time-monthly-pay-card";
import { LocalFullTimeEmployeeCpfCard } from "@/components/dashboard/local-full-time-employee-cpf-card";
import {
    WorkerCompositionCard,
    type WorkerCompositionBucket,
} from "@/components/dashboard/worker-composition-card";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    WORKER_EMPLOYMENT_ARRANGEMENTS,
    WORKER_EMPLOYMENT_TYPES,
} from "@/types/status";
import { Clock, List, Plus, SquarePen, Users } from "lucide-react";

function formatMinimumHours(n: number): string {
    return n.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
}

export async function WorkerOverviewLoader() {
    const [rows, activeWorkersResult, fullTimePayRows, foreignFtHoursAgg] =
        await Promise.all([
        db
            .select({
                employmentType: employmentTable.employmentType,
                employmentArrangement: employmentTable.employmentArrangement,
                count: count(),
            })
            .from(workerTable)
            .innerJoin(
                employmentTable,
                eq(workerTable.employmentId, employmentTable.id),
            )
            .where(eq(workerTable.status, "Active"))
            .groupBy(
                employmentTable.employmentType,
                employmentTable.employmentArrangement,
            ),
        db
            .select({ count: count() })
            .from(workerTable)
            .where(eq(workerTable.status, "Active")),
        db
            .select({
                id: workerTable.id,
                name: workerTable.name,
                arrangement: employmentTable.employmentArrangement,
                monthlyPay: employmentTable.monthlyPay,
                cpf: employmentTable.cpf,
            })
            .from(workerTable)
            .innerJoin(
                employmentTable,
                eq(workerTable.employmentId, employmentTable.id),
            )
            .where(
                and(
                    eq(workerTable.status, "Active"),
                    eq(employmentTable.employmentType, "Full Time"),
                ),
            )
            .orderBy(
                asc(employmentTable.employmentArrangement),
                asc(workerTable.name),
            ),
        db
            .select({
                minHours: min(employmentTable.minimumWorkingHours),
                maxHours: max(employmentTable.minimumWorkingHours),
            })
            .from(workerTable)
            .innerJoin(
                employmentTable,
                eq(workerTable.employmentId, employmentTable.id),
            )
            .where(
                and(
                    eq(workerTable.status, "Active"),
                    eq(employmentTable.employmentType, "Full Time"),
                    eq(
                        employmentTable.employmentArrangement,
                        "Foreign Worker",
                    ),
                ),
            ),
    ]);

    const activeCount = Number(activeWorkersResult[0]?.count ?? 0);

    const buckets: WorkerCompositionBucket[] = WORKER_EMPLOYMENT_TYPES.flatMap(
        (type) =>
            WORKER_EMPLOYMENT_ARRANGEMENTS.map((arrangement) => {
                const match = rows.find(
                    (r) =>
                        r.employmentType === type &&
                        r.employmentArrangement === arrangement,
                );
                return {
                    type,
                    arrangement,
                    count: Number(match?.count ?? 0),
                };
            }),
    );

    const foreignFullTimeRows = fullTimePayRows.filter(
        (r) => r.arrangement === "Foreign Worker",
    );
    const localFullTimeRows = fullTimePayRows.filter(
        (r) => r.arrangement === "Local Worker",
    );

    const foreignFtMonthlyPayTotal = foreignFullTimeRows.reduce(
        (acc, r) => acc + (r.monthlyPay ?? 0),
        0,
    );

    const localFtEmployeeCpfTotal = localFullTimeRows.reduce(
        (acc, r) => acc + (r.cpf ?? 0),
        0,
    );

    const [hoursRow] = foreignFtHoursAgg;
    const minHours =
        hoursRow?.minHours != null ? Number(hoursRow.minHours) : null;
    const maxHours =
        hoursRow?.maxHours != null ? Number(hoursRow.maxHours) : null;

    let foreignFtMinHoursRangeLabel: string;
    if (foreignFullTimeRows.length === 0) {
        foreignFtMinHoursRangeLabel = "—";
    } else if (minHours == null && maxHours == null) {
        foreignFtMinHoursRangeLabel = "Not set";
    } else if (
        minHours != null &&
        maxHours != null &&
        minHours === maxHours
    ) {
        foreignFtMinHoursRangeLabel = `${formatMinimumHours(minHours)} hrs`;
    } else if (minHours != null && maxHours != null) {
        foreignFtMinHoursRangeLabel = `${formatMinimumHours(minHours)} – ${formatMinimumHours(maxHours)} hrs`;
    } else {
        const only = minHours ?? maxHours;
        foreignFtMinHoursRangeLabel =
            only != null ? `${formatMinimumHours(only)} hrs` : "—";
    }

    return (
        <div className="space-y-6">
            <DashboardQuickActionsCard
                title="Quick actions"
                actions={[
                    {
                        href: "/dashboard/worker/all",
                        label: "View all workers",
                        icon: List,
                    },
                    {
                        href: "/dashboard/worker/new",
                        label: "New worker",
                        icon: Plus,
                    },
                    {
                        href: "/dashboard/worker/mass-edit",
                        label: "Mass edit workers",
                        icon: SquarePen,
                    },
                ]}
            />

            <div className="grid grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Active workers
                        </CardTitle>
                        <Users className="text-muted-foreground size-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeCount}</div>
                        <p className="text-muted-foreground text-xs">
                            Workers with Active status
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Min. hours (Foreign FT)
                        </CardTitle>
                        <Clock className="text-muted-foreground size-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold tabular-nums">
                            {foreignFtMinHoursRangeLabel}
                        </div>
                        <p className="text-muted-foreground text-xs">
                            Range of minimum working hours on employment for
                            active Foreign Worker, Full Time staff
                        </p>
                    </CardContent>
                </Card>
                <FullTimeMonthlyPayCard
                    totalMonthlyPay={foreignFtMonthlyPayTotal}
                />
                <LocalFullTimeEmployeeCpfCard
                    totalEmployeeCpf={localFtEmployeeCpfTotal}
                />
            </div>

            <WorkerCompositionCard buckets={buckets} />
        </div>
    );
}
