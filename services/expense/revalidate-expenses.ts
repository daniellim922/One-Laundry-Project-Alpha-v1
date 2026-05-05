import { revalidateTransportPaths } from "@/app/api/_shared/revalidate";

const EXPENSE_PATHS = [
    "/dashboard/expenses",
    "/dashboard/expenses/all",
    "/dashboard/expenses/new",
    "/dashboard/expenses/categories",
    { path: "/dashboard/expenses/[id]", type: "page" as const },
    { path: "/dashboard/expenses/[id]/view", type: "page" as const },
    { path: "/dashboard/expenses/[id]/edit", type: "page" as const },
];

export function revalidateExpenseDashboardPaths() {
    revalidateTransportPaths(EXPENSE_PATHS);
}
