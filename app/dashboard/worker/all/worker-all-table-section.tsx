"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { MassEditWorkingHoursButton } from "@/app/dashboard/worker/mass-edit/mass-edit-working-hours-button";
import { columns } from "./columns";
import type { WorkerWithEmployment } from "@/db/tables/payroll/workerTable";
import type { WorkerEmploymentArrangement } from "@/types/status";
import {
    MassEditWorkingHoursResultTable,
    type MassEditWorkingHoursResultRow,
} from "@/app/dashboard/worker/mass-edit/mass-edit-working-hours-result-table";

export function WorkerAllTableSection({
    workers,
    workersForMassEdit,
}: {
    workers: WorkerWithEmployment[];
    workersForMassEdit: Array<{
        id: string;
        name: string;
        employmentArrangement: WorkerEmploymentArrangement;
        minimumWorkingHours: number | null;
    }>;
}) {
    const [massEditResults, setMassEditResults] = React.useState<
        MassEditWorkingHoursResultRow[]
    >([]);

    return (
        <div className="space-y-4">
            <MassEditWorkingHoursResultTable rows={massEditResults} />
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
                        <MassEditWorkingHoursButton
                            workers={workersForMassEdit}
                            onResult={setMassEditResults}
                        />
                    </div>
                }
            />
        </div>
    );
}
