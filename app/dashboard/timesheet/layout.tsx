import { ReactNode } from "react";
import { requirePermission } from "@/lib/require-permission";

export default async function TimesheetLayout({
    children,
}: {
    children: ReactNode;
}) {
    await requirePermission("Timesheet", "read");
    return <>{children}</>;
}
