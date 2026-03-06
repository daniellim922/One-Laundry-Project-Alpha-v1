import { db } from "@/lib/db";
// import { rolesTable, type SelectRole } from "@/db/workersTable";
import { columns } from "./columns";
import { DataTable } from "@/components/data-table";

export default async function Page() {
    // const roles: SelectRole[] = await db.select().from(rolesTable);

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
                <p className="text-muted-foreground">
                    Manage roles and permissions.
                </p>
            </div>

            <DataTable
                columns={columns}
                data={[]}
                searchKey="name"
                searchParamKey="search"
            />
        </div>
    );
}
