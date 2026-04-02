import { requirePermission } from "@/utils/permissions/require-permission";
import { db } from "@/lib/db";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { FormPageLayout } from "@/components/form-page-layout";
import { PayrollForm } from "./payroll-form";
import { eq } from "drizzle-orm";
import { employmentTable } from "@/db/tables/payroll/employmentTable";

export default async function NewPayrollPage() {
    await requirePermission("Payroll", "create");

    const workers = await db
        .select({
            id: workerTable.id,
            name: workerTable.name,
            status: workerTable.status,
            employmentType: employmentTable.employmentType,
            employmentArrangement: employmentTable.employmentArrangement,
        })
        .from(workerTable)
        .innerJoin(
            employmentTable,
            eq(workerTable.employmentId, employmentTable.id),
        )
        .where(eq(workerTable.status, "Active"))
        .orderBy(workerTable.name);

    return (
        <FormPageLayout
            title="Generate payroll"
            subtitle="Create a payroll record for a worker. Total hours and pay are calculated from timesheet entries."
            maxWidthClassName="max-w-6xl">
            <PayrollForm workers={workers} />
        </FormPageLayout>
    );
}
