import Link from "next/link";
import { and, count, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { employmentTable } from "@/db/tables/payroll/employmentTable";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { SimpleDonutChart } from "@/components/dashboard/simple-donut-chart";
import { ArrowRight, Plus, Users } from "lucide-react";
import { requirePermission } from "@/utils/permissions/require-permission";
import { checkPermission } from "@/utils/permissions/permissions";
import { MassEditWorkingHoursButton } from "./mass-edit/mass-edit-working-hours-button";

export default async function WorkerOverviewPage() {
    const { userId } = await requirePermission("Workers", "read");

    const canMassEditWorkingHours = await checkPermission(
        userId,
        "Workers",
        "update",
    );

    const [[{ total }], [{ active }]] = await Promise.all([
        db.select({ total: count() }).from(workerTable),
        db
            .select({ active: count() })
            .from(workerTable)
            .where(eq(workerTable.status, "Active")),
    ]);

    const inactive = Number(total) - Number(active);
    const workersForMassEdit = canMassEditWorkingHours
        ? await db
              .select({
                  id: workerTable.id,
                  name: workerTable.name,
                  employmentArrangement: employmentTable.employmentArrangement,
                  minimumWorkingHours: employmentTable.minimumWorkingHours,
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
              )
              .orderBy(desc(workerTable.updatedAt))
        : [];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Worker</h1>
                <p className="text-muted-foreground">
                    Overview of your workforce and quick actions
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total workers
                        </CardTitle>
                        <Users className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{total}</div>
                        <p className="text-muted-foreground text-xs">
                            {active} Active, {inactive} Inactive
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button asChild>
                    <Link href="/dashboard/worker/all">
                        View all workers
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
                <Button variant="outline" asChild>
                    <Link href="/dashboard/worker/new">
                        <Plus className="mr-2 h-4 w-4" />
                        New worker
                    </Link>
                </Button>
                {canMassEditWorkingHours ? (
                    <MassEditWorkingHoursButton workers={workersForMassEdit} />
                ) : null}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Status breakdown</CardTitle>
                    <CardDescription>Active vs Inactive workers</CardDescription>
                </CardHeader>
                <CardContent>
                    <SimpleDonutChart
                        centerLabel="workers"
                        segments={[
                            {
                                key: "active",
                                label: "Active",
                                value: Number(active),
                            },
                            {
                                key: "inactive",
                                label: "Inactive",
                                value: inactive,
                            },
                        ]}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
