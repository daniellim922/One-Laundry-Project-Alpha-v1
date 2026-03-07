import { checkPermission } from "./permissions";

export type NavItemSerializable = {
    title: string;
    url: string;
    iconName: "Home" | "Workers" | "Timesheet" | "Expenses" | "IAM";
    featureName: string;
};

export const NAV_ITEMS: NavItemSerializable[] = [
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
    },
    {
        title: "Timesheet",
        url: "/dashboard/timesheet",
        iconName: "Timesheet",
        featureName: "Timesheet",
    },
    {
        title: "Expenses",
        url: "/dashboard/expenses",
        iconName: "Expenses",
        featureName: "Expenses",
    },
    {
        title: "IAM",
        url: "/dashboard/iam",
        iconName: "IAM",
        featureName: "IAM (Identity and Access Management)",
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
