"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Clock,
  CreditCard,
  LayoutDashboard,
  Receipt,
  Shield,
  Users,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const navItems = [
  { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { title: "Workers", href: "/dashboard/workers", icon: Users },
  { title: "Payrolls", href: "/dashboard/payrolls", icon: CreditCard },
  { title: "Expenses", href: "/dashboard/expenses", icon: Receipt },
  { title: "Timesheets", href: "/dashboard/timesheets", icon: Clock },
  {
    title: "Identity Access Management",
    href: "/dashboard/iam",
    icon: Shield,
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <span className="font-semibold">One Laundry</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
