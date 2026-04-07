"use client";

import Link from "next/link";
import * as React from "react";
import { Plus } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { columns } from "../columns";
import { MassEditWorkingHoursButton } from "../mass-edit-working-hours-button";
import {
    MassEditWorkingHoursResultTable,
    type MassEditWorkingHoursResultRow,
} from "../mass-edit-working-hours-result-table";
import type { WorkerWithEmployment } from "@/db/tables/payroll/workerTable";
import type { WorkerEmploymentArrangement } from "@/types/status";

type WorkerForMassEdit = {
    id: string;
    name: string;
    employmentArrangement: WorkerEmploymentArrangement;
    minimumWorkingHours: number | null;
};

export function WorkerAllTableSection({
    workers,
    workersForMassEdit,
    canCreateWorker,
    canMassEditWorkingHours,
}: {
    workers: WorkerWithEmployment[];
    workersForMassEdit: WorkerForMassEdit[];
    canCreateWorker: boolean;
    canMassEditWorkingHours: boolean;
}) {
    const [resultRows, setResultRows] = React.useState<
        MassEditWorkingHoursResultRow[]
    >([]);

    return (
        <div className="space-y-4">
            <MassEditWorkingHoursResultTable rows={resultRows} />

            <DataTable
                columns={columns}
                data={workers}
                searchParamKey="search"
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        {canCreateWorker ? (
                            <Button asChild>
                                <Link href="/dashboard/worker/new">
                                    <Plus className="mr-2 h-4 w-4" />
                                    New worker
                                </Link>
                            </Button>
                        ) : null}
                        {canMassEditWorkingHours ? (
                            <MassEditWorkingHoursButton
                                workers={workersForMassEdit}
                                onResult={setResultRows}
                            />
                        ) : null}
                    </div>
                }
            />
        </div>
    );
}
