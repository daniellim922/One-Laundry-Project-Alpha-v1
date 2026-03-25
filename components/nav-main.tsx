"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from "@/components/ui/sidebar";

export function NavMain({
    items,
}: {
    items: {
        title: string;
        url: string;
        icon?: LucideIcon;
        isActive?: boolean;
        items?: {
            title: string;
            url: string;
        }[];
    }[];
}) {
    const [openKeys, setOpenKeys] = React.useState<Set<string>>(() =>
        new Set(
            items
                .filter((i) => i.items?.length && i.isActive)
                .map((i) => i.title),
        ),
    );
    React.useEffect(() => {
        const activeTitles = items
            .filter((i) => i.items?.length && i.isActive)
            .map((i) => i.title);
        if (activeTitles.length > 0) {
            setOpenKeys((prev) => new Set([...prev, ...activeTitles]));
        }
    }, [items]);

    return (
        <SidebarGroup>
            <SidebarGroupLabel>Operations</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) =>
                    item.items?.length ? (
                        <Collapsible
                            key={item.title}
                            asChild
                            open={openKeys.has(item.title)}
                            onOpenChange={(open) => {
                                setOpenKeys((prev) => {
                                    const next = new Set(prev);
                                    if (open) next.add(item.title);
                                    else next.delete(item.title);
                                    return next;
                                });
                            }}
                            className="group/collapsible">
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    tooltip={item.title}
                                    isActive={item.isActive}>
                                    <Link href={item.url}>
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuAction
                                        aria-label={`Toggle ${item.title} submenu`}>
                                        <ChevronRight className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                    </SidebarMenuAction>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarMenuSub>
                                        {item.items.map((subItem) => (
                                            <SidebarMenuSubItem
                                                key={subItem.title}>
                                                <SidebarMenuSubButton
                                                    asChild>
                                                    <Link
                                                        href={subItem.url}>
                                                        <span>
                                                            {subItem.title}
                                                        </span>
                                                    </Link>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        ))}
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>
                    ) : (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                tooltip={item.title}
                                isActive={item.isActive}>
                                <Link href={item.url}>
                                    {item.icon && <item.icon />}
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ),
                )}
            </SidebarMenu>
        </SidebarGroup>
    );
}
