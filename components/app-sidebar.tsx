"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
    Banknote,
    Command,
    DollarSign,
    FileSpreadsheet,
    GalleryVerticalEnd,
    Home,
    Layout,
    Shield,
    User,
    Wallet,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import { SidebarModeToggle } from "@/components/theme-switcher";
import { TeamSwitcher } from "@/components/team-switcher";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
} from "@/components/ui/sidebar";

const ICON_MAP = {
    Home,
    Workers: User,
    Timesheet: FileSpreadsheet,
    Payroll: Wallet,
    Advance: Banknote,
    Expenses: DollarSign,
    IAM: Shield,
} as const;

const PROJECT_ICON_MAP = {
    Layout,
    Users: User,
    DollarSign,
    FileSpreadsheet,
} as const;

const PROJECTS = [
    { name: "Design Engineering", url: "/dashboard", iconName: "Layout" as const },
    { name: "Operations", url: "/dashboard/workers", iconName: "Users" as const },
    { name: "Finance", url: "/dashboard/expenses", iconName: "DollarSign" as const },
];

const data = {
    user: {
        name: "shadcn",
        email: "m@example.com",
        avatar: "/avatars/shadcn.jpg",
    },
    teams: [
        { name: "Acme Inc", logo: GalleryVerticalEnd, plan: "Enterprise" },
        { name: "Acme Corp.", logo: Command, plan: "Startup" },
    ],
};

export function AppSidebar({
    items,
    ...props
}: React.ComponentProps<typeof Sidebar> & {
    items: {
        title: string;
        url: string;
        iconName:
            | "Home"
            | "Workers"
            | "Timesheet"
            | "Payroll"
            | "Advance"
            | "Expenses"
            | "IAM";
        featureName: string;
        items?: { title: string; url: string }[];
    }[];
}) {
    const pathname = usePathname();

    const navItemsWithIcons = React.useMemo(() => {
        return items.map((item) => {
            const subItems = "items" in item ? item.items : undefined;
            const isActive =
                pathname === item.url ||
                pathname.startsWith(item.url + "/") ||
                (subItems?.some(
                    (s) => pathname === s.url || pathname.startsWith(s.url + "/")
                ) ?? false);
            return {
                ...item,
                icon: ICON_MAP[item.iconName],
                items: subItems,
                isActive,
            };
        });
    }, [items, pathname]);
    const projectsWithIcons = React.useMemo(
        () =>
            PROJECTS.map((p) => ({
                ...p,
                icon: PROJECT_ICON_MAP[p.iconName],
            })),
        [],
    );

    return (
        <Sidebar collapsible="icon" variant="inset" {...props}>
            <SidebarHeader>
                <TeamSwitcher teams={data.teams} />
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={navItemsWithIcons} />
                <NavProjects projects={projectsWithIcons} />
            </SidebarContent>
            <SidebarFooter>
                <SidebarModeToggle />
                <NavUser user={data.user} />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
