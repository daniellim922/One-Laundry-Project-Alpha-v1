import { ReactNode } from "react";

import { signOutAction } from "@/app/dashboard/actions";
import { LogoutForm } from "@/components/auth/logout-form";
import { getAllNavItems } from "@/utils/nav/nav-config";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { DashboardBreadcrumbs } from "@/components/dashboard/dashboard-breadcrumbs";
import { Separator } from "@/components/ui/separator";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";

export default async function DashboardLayout({
    children,
}: {
    children: ReactNode;
}) {
    const navItems = getAllNavItems();

    return (
        <SidebarProvider>
            <AppSidebar items={navItems} />
            <SidebarInset className="min-w-0">
                <header className="print:hidden flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                    <div className="flex flex-1 items-center justify-between gap-3 px-4">
                        <div className="flex items-center gap-2">
                        <SidebarTrigger className="-ml-1" />
                        <Separator
                            orientation="vertical"
                            className="mr-2 data-[orientation=vertical]:h-4"
                        />
                        <DashboardBreadcrumbs />
                        </div>
                        <LogoutForm action={signOutAction} />
                    </div>
                </header>
                <div className="min-w-0 flex flex-1 flex-col gap-4 p-4 pt-0">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
