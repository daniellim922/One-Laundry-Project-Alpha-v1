import Link from "next/link";
import { Suspense } from "react";

import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { listAdvanceRequestsWithWorkers } from "@/lib/advances-queries";
import { requirePermission } from "@/lib/require-permission";
import { checkPermission } from "@/lib/permissions";
import { Plus } from "lucide-react";

import { columns } from "../columns";

export default async function AdvanceAllPage() {
    const { userId } = await requirePermission("Advance", "read");
    const canCreate = await checkPermission(userId, "Advance", "create");

    const advanceRequests = await listAdvanceRequestsWithWorkers();

    return (
        <div className="space-y-6">
            <div>
                <h2
                    className="text-2xl font-semibold tracking-tight"
                    data-testid="advance-list-heading">
                    All advances
                </h2>
                <p className="text-muted-foreground">
                    All advance loans across workers.
                </p>
            </div>

            <Suspense
                fallback={
                    <div className="rounded-md border p-6 text-sm text-muted-foreground">
                        Loading...
                    </div>
                }>
                <DataTable
                    columns={columns}
                    data={advanceRequests}
                    searchKey="workerName"
                    searchParamKey="search"
                    actions={
                        canCreate ? (
                            <Button asChild>
                                <Link href="/dashboard/advance/new">
                                    <Plus className="mr-2 h-4 w-4" />
                                    New advance
                                </Link>
                            </Button>
                        ) : null
                    }
                />
            </Suspense>
        </div>
    );
}
