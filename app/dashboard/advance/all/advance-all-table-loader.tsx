import Link from "next/link";

import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { listAdvanceRequestsWithWorkers } from "@/utils/advance/queries";
import { Plus } from "lucide-react";

import { columns } from "./columns";

export async function AdvanceAllTableLoader() {
    const advanceRequests = await listAdvanceRequestsWithWorkers();

    return (
        <DataTable
            columns={columns}
            data={advanceRequests}
            searchParamKey="search"
            actions={
                <Button asChild>
                    <Link href="/dashboard/advance/new">
                        <Plus className="mr-2 h-4 w-4" />
                        New advance
                    </Link>
                </Button>
            }
        />
    );
}
