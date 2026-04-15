import { DASHBOARD_NAV_FEATURES } from "./dashboard-nav-features";

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
        | "Advance";
    featureName: string;
    items?: NavSubItem[];
};

type NavItemConfig = NavItemSerializable;

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
    };
}

const NAV_ITEMS: NavItemConfig[] = DASHBOARD_NAV_FEATURES.map(toNavItemConfig);

function toSerializable(item: NavItemConfig): NavItemSerializable {
    return item;
}

export function getAllNavItems(): NavItemSerializable[] {
    return NAV_ITEMS.map((item) => toSerializable(item));
}

export async function getVisibleNavItems(
    userId: string,
): Promise<NavItemSerializable[]> {
    void userId;
    return getAllNavItems();
}
