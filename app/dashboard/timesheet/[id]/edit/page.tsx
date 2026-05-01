import { notFound, redirect } from "next/navigation";

import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { FormPageLayout } from "@/components/form-page-layout";
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

export default async function EditTimesheetEntryPage({ params }: PageProps) {
    const { id } = await params;

    const entry = await loadTimesheetEntryById(id);

    if (!entry) notFound();

    if (entry.status === "Timesheet Paid") {
        redirect(`/dashboard/timesheet/${id}/view`);
    }

    const workers = await loadWorkersForTimesheetForm();

    return (
        <FormPageLayout
            title="Edit timesheet entry"
            subtitle="Update clock in/out and worker for this entry"
            status={<EntityStatusBadge status={entry.status} />}>
            <TimesheetEntryForm
                workers={workers}
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
