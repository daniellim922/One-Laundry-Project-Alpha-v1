import { and, asc, count, eq, isNotNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { workerTable } from "@/db/tables/workerTable";
import { employmentTable } from "@/db/tables/employmentTable";
import { DashboardQuickActionsCard } from "@/components/dashboard/dashboard-quick-actions-card";
import { FullTimeMonthlyPayCard } from "@/components/dashboard/full-time-monthly-pay-card";
import { LocalFullTimeEmployeeCpfCard } from "@/components/dashboard/local-full-time-employee-cpf-card";
import { MinimumWorkingHoursBarCard } from "@/components/dashboard/minimum-working-hours-bar-card";
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
import { List, Plus, SquarePen, Users } from "lucide-react";

export async function WorkerOverviewLoader() {
    const [rows, activeWorkersResult, fullTimePayRows, minHoursDistribution] =
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
                hours: employmentTable.minimumWorkingHours,
                workerCount: count(),
            })
            .from(workerTable)
            .innerJoin(
                employmentTable,
                eq(workerTable.employmentId, employmentTable.id),
            )
            .where(
                and(
                    eq(workerTable.status, "Active"),
                    isNotNull(employmentTable.minimumWorkingHours),
                ),
            )
            .groupBy(employmentTable.minimumWorkingHours)
            .orderBy(asc(employmentTable.minimumWorkingHours)),
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

    const minimumHoursBuckets = minHoursDistribution.map((row) => ({
        hours: Number(row.hours),
        workerCount: Number(row.workerCount),
    }));

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

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Active workers
                            </CardTitle>
                            <Users className="text-muted-foreground size-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {activeCount}
                            </div>
                            <p className="text-muted-foreground text-xs">
                                Workers with Active status
                            </p>
                        </CardContent>
                    </Card>
                    <MinimumWorkingHoursBarCard
                        buckets={minimumHoursBuckets}
                    />
                </div>
                <div className="w-full space-y-4">
                    <FullTimeMonthlyPayCard rows={foreignFullTimeRows} />
                    <LocalFullTimeEmployeeCpfCard rows={localFullTimeRows} />
                </div>
            </div>

            <WorkerCompositionCard buckets={buckets} />
        </div>
    );
}
