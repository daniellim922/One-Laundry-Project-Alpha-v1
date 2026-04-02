import { ReactNode } from "react";
import { requirePermission } from "@/utils/require-permission";

export default async function ExpensesLayout({
    children,
}: {
    children: ReactNode;
}) {
    await requirePermission("Expenses", "read");
    return <>{children}</>;
}
