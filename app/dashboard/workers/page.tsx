import Link from "next/link";
import { Suspense } from "react";
import { count } from "drizzle-orm";

import { db } from "@/lib/db";
import {
    workerTable,
    type SelectWorker,
} from "@/db/tables/payroll/workerTable";
import { columns } from "./columns";
import { DataTable } from "@/components/data-table";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Plus, Users } from "lucide-react";

export default async function Page() {
    const [workers, workersCountResult] = await Promise.all([
        db.select().from(workerTable),
        db.select({ count: count() }).from(workerTable),
    ]);
    const workersCount = workersCountResult[0]?.count ?? 0;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    Workers
                </h1>
                <p className="text-muted-foreground">
                    Manage and view your workers here.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Workers
                        </CardTitle>
                        <Users className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{workersCount}</div>
                        <p className="text-muted-foreground text-xs">
                            Active workers in your workforce
                        </p>
                        <Button variant="link" className="h-auto p-0" asChild>
                            <Link href="/dashboard/workers">
                                View all workers
                                <ArrowRight className="ml-1 h-3 w-3" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Quick Actions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                        <Button asChild size="sm">
                            <Link href="/dashboard/workers/new">
                                <Plus className="mr-2 h-4 w-4" />
                                Add worker
                            </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/dashboard/workers">
                                Browse workers
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <Suspense
                fallback={
                    <div className="rounded-md border p-6 text-sm text-muted-foreground">
                        Loading...
                    </div>
                }>
                <DataTable
                    columns={columns}
                    data={workers}
                    searchKey="name"
                    searchParamKey="search"
                    actions={
                        <Button asChild>
                            <Link href="/dashboard/workers/new">
                                <Plus className="mr-2 h-4 w-4" />
                                Add worker
                            </Link>
                        </Button>
                    }
                />
            </Suspense>
        </div>
    );
}
