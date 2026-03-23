import { ReactNode } from "react";
import { requirePermission } from "@/lib/require-permission";

export default async function ExpensesLayout({
    children,
}: {
    children: ReactNode;
}) {
    await requirePermission("Expenses", "read");
    return <>{children}</>;
}
