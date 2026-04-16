import { db } from "@/lib/db";
import { workerTable } from "@/db/tables/workerTable";
import { FormPageLayout } from "@/components/form-page-layout";
import { TimesheetEntryForm } from "../timesheet-entry-form";

export default async function NewTimesheetEntryPage() {
    const workers = await db
        .select({ id: workerTable.id, name: workerTable.name })
        .from(workerTable)
        .orderBy(workerTable.name);

    return (
        <FormPageLayout
            title="Add new timesheet"
            subtitle="Record clock in and clock out for a worker">
            <TimesheetEntryForm workers={workers} />
        </FormPageLayout>
    );
}
