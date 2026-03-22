import Link from "next/link";
import { Suspense } from "react";

import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { listAdvancesWithWorkers } from "@/lib/advances-queries";
import { Plus } from "lucide-react";

import { columns } from "./columns";

export default async function AdvanceListPage() {
    const advances = await listAdvancesWithWorkers();

    return (
        <div className="space-y-6">
            <div>
                <h1
                    className="text-2xl font-semibold tracking-tight"
                    data-testid="advance-list-heading">
                    Advance loans
                </h1>
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
                    data={advances}
                    searchKey="workerName"
                    searchParamKey="search"
                    actions={
                        <Button asChild>
                            <Link href="/dashboard/advance/new">
                                <Plus className="mr-2 h-4 w-4" />
                                Add Advance Request
                            </Link>
                        </Button>
                    }
                />
            </Suspense>
        </div>
    );
}
