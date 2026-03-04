import type { InsertRole } from "@/db/rolesTable";

export const roles: InsertRole[] = [
    { name: "Admin", description: "Full system access" },
    { name: "Manager", description: "Manage workers and view reports" },
    { name: "Worker", description: "View and update timesheet" },
    { name: "Viewer", description: "Read-only access" },
];
