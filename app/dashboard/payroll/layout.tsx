import { ReactNode } from "react";
import { requirePermission } from "@/lib/require-permission";

export default async function PayrollLayout({
    children,
}: {
    children: ReactNode;
}) {
    await requirePermission("Payroll", "read");
    return <>{children}</>;
}
