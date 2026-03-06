import Link from "next/link";

import { db } from "@/lib/db";
import { workersTable, type SelectWorker } from "@/db/tables/workersTable";
import { columns } from "./columns";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function Page() {
    const workers: SelectWorker[] = await db.select().from(workersTable);

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    Workers
                </h1>
                <p className="text-muted-foreground">
                    Manage and view your workers here.
                </p>
            </div>

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
        </div>
    );
}
