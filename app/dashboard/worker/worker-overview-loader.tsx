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
    WORKER_EMPLOYMENT_ARRANGEMENTS,
    WORKER_EMPLOYMENT_TYPES,
} from "@/types/status";
import { List, Plus, SquarePen } from "lucide-react";

export async function WorkerOverviewLoader() {
    const [rows, fullTimePayRows, minHoursDistribution] = await Promise.all([
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
                <MinimumWorkingHoursBarCard buckets={minimumHoursBuckets} />
                <div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-2">
                    <FullTimeMonthlyPayCard rows={foreignFullTimeRows} />
                    <LocalFullTimeEmployeeCpfCard rows={localFullTimeRows} />
                </div>
            </div>

            <WorkerCompositionCard buckets={buckets} />
        </div>
    );
}
