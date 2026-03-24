import Link from "next/link";

import { requirePermission } from "@/lib/require-permission";
import { db } from "@/lib/db";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { Button } from "@/components/ui/button";
import { PayrollForm } from "../payroll-form";
import { ArrowLeft } from "lucide-react";
import { eq } from "drizzle-orm";

export default async function NewPayrollPage() {
    await requirePermission("Payroll", "create");

    const workers = await db
        .select({
            id: workerTable.id,
            name: workerTable.name,
            status: workerTable.status,
        })
        .from(workerTable)
        .where(eq(workerTable.status, "Active"))
        .orderBy(workerTable.name);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/payroll">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Generate payroll
                    </h1>
                    <p className="text-muted-foreground">
                        Create a payroll record for a worker. Total hours and
                        pay are calculated from timesheet entries.
                    </p>
                </div>
            </div>
            <PayrollForm workers={workers} />
        </div>
    );
}
