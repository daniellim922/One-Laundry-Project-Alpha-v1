import { checkPermission } from "./permissions";

export type NavItemSerializable = {
    title: string;
    url: string;
    iconName: "Home" | "Workers" | "Timesheet" | "Payroll" | "Expenses" | "IAM";
    featureName: string;
};

export type NavSubItem = {
    title: string;
    url: string;
};

export const NAV_ITEMS: (NavItemSerializable & {
    items?: NavSubItem[];
})[] = [
    {
        title: "Home",
        url: "/dashboard",
        iconName: "Home",
        featureName: "Home",
    },
    {
        title: "Workers",
        url: "/dashboard/workers",
        iconName: "Workers",
        featureName: "Workers",
        items: [
            { title: "All workers", url: "/dashboard/workers" },
            { title: "Add worker", url: "/dashboard/workers/new" },
        ],
    },
    {
        title: "Timesheet",
        url: "/dashboard/timesheet",
        iconName: "Timesheet",
        featureName: "Timesheet",
        items: [
            { title: "All timesheets", url: "/dashboard/timesheet" },
            { title: "Add timesheet", url: "/dashboard/timesheet/new" },
            { title: "Import timesheet", url: "/dashboard/timesheet/import" },
        ],
    },
    {
        title: "Payroll",
        url: "/dashboard/payroll",
        iconName: "Payroll",
        featureName: "Payroll",
        items: [
            { title: "All payrolls", url: "/dashboard/payroll" },
            { title: "Generate payroll", url: "/dashboard/payroll/new" },
        ],
    },
    {
        title: "Expenses",
        url: "/dashboard/expenses",
        iconName: "Expenses",
        featureName: "Expenses",
        items: [
            { title: "All expenses", url: "/dashboard/expenses" },
            { title: "Add expense", url: "/dashboard/expenses/new" },
        ],
    },
    {
        title: "IAM",
        url: "/dashboard/iam",
        iconName: "IAM",
        featureName: "IAM (Identity and Access Management)",
        items: [{ title: "Users & Roles", url: "/dashboard/iam" }],
    },
];

/**
 * Returns nav items the user has read permission for (serializable, no icon components).
 */
export async function getVisibleNavItems(
    userId: string,
): Promise<NavItemSerializable[]> {
    const results = await Promise.all(
        NAV_ITEMS.map(async (item) => ({
            item,
            hasAccess: await checkPermission(userId, item.featureName, "read"),
        })),
    );
    return results.filter((r) => r.hasAccess).map((r) => r.item);
}
