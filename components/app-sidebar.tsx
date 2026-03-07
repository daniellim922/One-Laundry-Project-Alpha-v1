"use client";

import * as React from "react";
import {
    Command,
    DollarSign,
    FileSpreadsheet,
    Home,
    Shield,
    User,
} from "lucide-react";

import type { NavItemSerializable } from "@/lib/nav-config";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";

const ICON_MAP = {
    Home,
    Workers: User,
    Timesheet: FileSpreadsheet,
    Expenses: DollarSign,
    IAM: Shield,
} as const;

const data = {
    user: {
        name: "shadcn",
        email: "m@example.com",
        avatar: "/avatars/shadcn.jpg",
    },
};

export function AppSidebar({
    items,
    ...props
}: React.ComponentProps<typeof Sidebar> & {
    items: NavItemSerializable[];
}) {
    const navItemsWithIcons = React.useMemo(
        () =>
            items.map((item) => ({
                ...item,
                icon: ICON_MAP[item.iconName],
            })),
        [items],
    );
    return (
        <Sidebar variant="inset" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <a href="#">
                                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                                    <Command className="size-4" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">
                                        Acme Inc
                                    </span>
                                    <span className="truncate text-xs">
                                        Enterprise
                                    </span>
                                </div>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={navItemsWithIcons} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={data.user} />
            </SidebarFooter>
        </Sidebar>
    );
}
