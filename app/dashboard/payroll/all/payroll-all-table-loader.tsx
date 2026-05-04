import Link from "next/link";

import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import {
    columns,
    type PayrollWithWorker,
} from "@/app/dashboard/payroll/columns";
import { queryPayrollRowsWithWorkerForList } from "@/services/payroll/_shared/query-payroll-selection-rows";

export async function PayrollAllTableLoader() {
    const data: PayrollWithWorker[] =
        await queryPayrollRowsWithWorkerForList();

    return (
        <DataTable
            columns={columns}
            data={data}
            searchParamKey="search"
            actions={
                <Button asChild>
                    <Link href="/dashboard/payroll/new">
                        <Plus className="mr-2 h-4 w-4" />
                        New payroll
                    </Link>
                </Button>
            }
        />
    );
}
