import Link from "next/link";

import { db } from "@/lib/db";
import { expensesTable } from "@/db/tables/expensesTable";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import { columns } from "../columns";

export async function ExpensesAllTableLoader() {
    const expenses = await db.select().from(expensesTable);

    return (
        <DataTable
            columns={columns}
            data={expenses}
            searchParamKey="search"
            actions={
                <Button asChild>
                    <Link href="/dashboard/expenses/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Add expense
                    </Link>
                </Button>
            }
        />
    );
}
