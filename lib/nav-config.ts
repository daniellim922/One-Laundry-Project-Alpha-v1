import { checkPermission } from "./permissions";

export type NavSubItem = {
    title: string;
    url: string;
};

export type NavItemSerializable = {
    title: string;
    url: string;
    iconName:
        | "Home"
        | "Workers"
        | "Timesheet"
        | "Payroll"
        | "Expenses"
        | "IAM"
        | "Advance";
    featureName: string;
    items?: NavSubItem[];
};

type NavItemConfig = NavItemSerializable & {
    /** When true, show in sidebar without IAM read check (featureName ignored for gating). */
    alwaysVisible?: boolean;
};

export const NAV_ITEMS: NavItemConfig[] = [
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
        title: "Advance",
        url: "/dashboard/advance",
        iconName: "Advance",
        featureName: "Advance",
        alwaysVisible: true,
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
function toSerializable(item: NavItemConfig): NavItemSerializable {
    const { alwaysVisible: _a, ...rest } = item;
    return rest;
}

export async function getVisibleNavItems(
    userId: string,
): Promise<NavItemSerializable[]> {
    const results = await Promise.all(
        NAV_ITEMS.map(async (item) => {
            if (item.alwaysVisible) {
                return { item, hasAccess: true as const };
            }
            return {
                item,
                hasAccess: await checkPermission(
                    userId,
                    item.featureName,
                    "read",
                ),
            };
        }),
    );
    return results.filter((r) => r.hasAccess).map((r) => toSerializable(r.item));
}
