"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { employmentArrangementBadgeTone } from "@/types/badge-tones";
import type { WorkerEmploymentArrangement } from "@/types/status";

export type MassEditWorkingHoursResultRow = {
    workerId: string;
    name: string;
    employmentArrangement: WorkerEmploymentArrangement;
    oldWorkingHours: number | null;
    newWorkingHours: number | null;
    status: "updated" | "failed";
};

function formatWorkingHours(value: number | null): string {
    return value == null ? "—" : `${value}h`;
}

export function MassEditWorkingHoursResultTable({
    rows,
}: {
    rows: MassEditWorkingHoursResultRow[];
}) {
    if (rows.length === 0) {
        return null;
    }

    return (
        <div
            className="space-y-2 rounded-md border p-3"
            data-testid="mass-edit-working-hours-results">
            <h3 className="text-sm font-medium">Mass edit working hours results</h3>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Employment Arrangement</TableHead>
                        <TableHead>Old Working Hours</TableHead>
                        <TableHead>New Working Hours</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((row) => (
                        <TableRow key={`${row.workerId}-${row.status}`}>
                            <TableCell>{row.name}</TableCell>
                            <TableCell>
                                <Badge
                                    variant="outline"
                                    className={
                                        employmentArrangementBadgeTone[
                                            row.employmentArrangement
                                        ]
                                    }>
                                    {row.employmentArrangement}
                                </Badge>
                            </TableCell>
                            <TableCell>{formatWorkingHours(row.oldWorkingHours)}</TableCell>
                            <TableCell>{formatWorkingHours(row.newWorkingHours)}</TableCell>
                            <TableCell>
                                {row.status === "updated"
                                    ? "✅ Updated"
                                    : "❌ Failed"}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
