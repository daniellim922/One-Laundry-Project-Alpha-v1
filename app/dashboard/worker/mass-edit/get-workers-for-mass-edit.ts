import { and, asc, eq } from "drizzle-orm";

import { employmentTable } from "@/db/tables/employmentTable";
import { workerTable } from "@/db/tables/workerTable";
import { db } from "@/lib/db";
import type {
    WorkerEmploymentArrangement,
    WorkerEmploymentType,
    WorkerStatus,
} from "@/types/status";

export type WorkerForMassEditWorkingHours = {
    id: string;
    name: string;
    status: WorkerStatus;
    employmentType: WorkerEmploymentType;
    employmentArrangement: WorkerEmploymentArrangement;
    minimumWorkingHours: number | null;
};

export async function getWorkersForMassEditWorkingHours(): Promise<
    WorkerForMassEditWorkingHours[]
> {
    const rows = await db
        .select({
            id: workerTable.id,
            name: workerTable.name,
            status: workerTable.status,
            employmentType: employmentTable.employmentType,
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
                eq(employmentTable.employmentArrangement, "Foreign Worker"),
            ),
        )
        .orderBy(asc(workerTable.name));

    return rows.map((row) => ({
        id: row.id,
        name: row.name,
        status: row.status,
        employmentType: row.employmentType,
        employmentArrangement: row.employmentArrangement,
        minimumWorkingHours:
            row.minimumWorkingHours != null
                ? Number(row.minimumWorkingHours)
                : null,
    }));
}
