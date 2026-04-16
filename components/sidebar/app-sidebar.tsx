"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
    Banknote,
    DollarSign,
    FileSpreadsheet,
    Home,
    Shirt,
    User,
    Wallet,
} from "lucide-react";

import { NavMain } from "@/components/sidebar/nav-main";
import { SidebarModeToggle } from "@/components/ui/theme-switcher";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar";

const ICON_MAP = {
    Home,
    Worker: User,
    Timesheet: FileSpreadsheet,
    Payroll: Wallet,
    Advance: Banknote,
    Expenses: DollarSign,
} as const;

export function AppSidebar({
    items,
    ...props
}: React.ComponentProps<typeof Sidebar> & {
    items: {
        title: string;
        url: string;
        iconName:
            | "Home"
            | "Worker"
            | "Timesheet"
            | "Payroll"
            | "Advance"
            | "Expenses";
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
                    (s) =>
                        pathname === s.url || pathname.startsWith(s.url + "/"),
                ) ??
                    false);
            return {
                ...item,
                icon: ICON_MAP[item.iconName],
                items: subItems,
                isActive,
            };
        });
    }, [items, pathname]);
    return (
        <Sidebar collapsible="icon" variant="inset" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <div className="flex w-full items-center gap-2">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                    <Shirt className="size-4" />
                                </div>
                                <span className="truncate font-medium">
                                    One Laundry
                                </span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={navItemsWithIcons} />
            </SidebarContent>
            <SidebarFooter>
                <SidebarModeToggle />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
