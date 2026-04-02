import { DASHBOARD_NAV_FEATURES } from "./dashboard-nav-features";
import { checkPermission } from "../permissions/permissions";

export type NavSubItem = {
    title: string;
    url: string;
};

export type NavItemSerializable = {
    title: string;
    url: string;
    iconName:
        | "Home"
        | "Worker"
        | "Timesheet"
        | "Payroll"
        | "Expenses"
        | "IAM"
        | "Advance";
    featureName: string;
    items?: NavSubItem[];
};

type NavItemConfig = NavItemSerializable & {
    alwaysVisible?: boolean;
};

function toNavItemConfig(f: (typeof DASHBOARD_NAV_FEATURES)[number]): NavItemConfig {
    const items =
        f.subFeatures.length > 0
            ? f.subFeatures.map((s) => ({ title: s.name, url: s.url }))
            : undefined;
    return {
        title: f.name,
        url: f.url,
        iconName: f.iconName,
        featureName: f.featureName,
        items,
        alwaysVisible: f.alwaysVisible,
    };
}

const NAV_ITEMS: NavItemConfig[] = DASHBOARD_NAV_FEATURES.map(toNavItemConfig);

/**
 * Returns nav items the user has read permission for (serializable, no icon components).
 */
function toSerializable(item: NavItemConfig): NavItemSerializable {
    const { alwaysVisible, ...rest } = item;
    void alwaysVisible;
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
