import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { FormPageLayout } from "@/components/form-page-layout";
import { Pencil } from "lucide-react";
import { TimesheetEntryForm } from "../../timesheet-entry-form";
import {
    loadTimesheetEntryById,
    loadWorkersForTimesheetForm,
} from "../_shared/load-timesheet";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function ViewTimesheetEntryPage({ params }: PageProps) {
    const { id } = await params;

    const entry = await loadTimesheetEntryById(id);

    if (!entry) notFound();

    const workers = await loadWorkersForTimesheetForm();

    return (
        <FormPageLayout
            title="Timesheet entry"
            subtitle="Clock in/out and worker for this entry (read-only)"
            status={<EntityStatusBadge status={entry.status} />}
            actions={
                entry.status === "Timesheet Paid" ? (
                    <Button variant="outline" disabled>
                        <Pencil className="h-4 w-4" />
                        Edit
                    </Button>
                ) : (
                    <Button asChild variant="outline">
                        <Link
                            href={`/dashboard/timesheet/${id}/edit`}
                            className="flex items-center gap-2">
                            <Pencil className="h-4 w-4" />
                            Edit
                        </Link>
                    </Button>
                )
            }>
            <TimesheetEntryForm
                workers={workers}
                disabled
                entry={{
                    id: entry.id,
                    workerId: entry.workerId,
                    dateIn: String(entry.dateIn),
                    dateOut: String(entry.dateOut),
                    timeIn: String(entry.timeIn),
                    timeOut: String(entry.timeOut),
                    status: entry.status,
                }}
            />
        </FormPageLayout>
    );
}
