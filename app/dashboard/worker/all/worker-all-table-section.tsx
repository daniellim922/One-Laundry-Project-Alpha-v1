"use client";

import Link from "next/link";
import { ListChecks, Plus } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { columns } from "./columns";
import type { WorkerWithEmployment } from "@/db/tables/workerTable";

export function WorkerAllTableSection({
    workers,
}: {
    workers: WorkerWithEmployment[];
}) {
    return (
        <DataTable
            columns={columns}
            data={workers}
            searchParamKey="search"
            actions={
                <div className="flex flex-wrap items-center gap-2">
                    <Button asChild>
                        <Link href="/dashboard/worker/new">
                            <Plus className="mr-2 h-4 w-4" />
                            New worker
                        </Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/dashboard/worker/mass-edit">
                            <ListChecks className="mr-2 h-4 w-4" />
                            Mass edit working hours
                        </Link>
                    </Button>
                </div>
            }
        />
    );
}
