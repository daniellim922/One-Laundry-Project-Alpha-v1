"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const LABEL_MAP: Record<string, string> = {
    dashboard: "Dashboard",
    advance: "Advance",
    worker: "Worker",
    timesheet: "Timesheet",
    payroll: "Payroll",
    expenses: "Expenses",
    new: "New",
    all: "All",
    edit: "Edit",
    view: "View",
    summary: "Summary",
    breakdown: "Breakdown",
};

const STATIC_SEGMENTS = new Set(Object.keys(LABEL_MAP));

function titleCaseFromSlug(slug: string) {
    return slug
        .split(/[-_]/g)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

function shortenId(id: string) {
    if (id.length <= 10) return id;
    return `${id.slice(0, 6)}…${id.slice(-2)}`;
}

function isIdSegment(seg: string) {
    return !STATIC_SEGMENTS.has(seg);
}

export function DashboardBreadcrumbs() {
    const pathname = usePathname() ?? "/";
    const segments = pathname.split("/").filter(Boolean);

    if (segments.length === 0) return null;

    const crumbs = segments.map((seg, idx) => {
        const isId = isIdSegment(seg);
        const label = isId ? shortenId(seg) : (LABEL_MAP[seg] ?? titleCaseFromSlug(seg));
        const href = isId
            ? pathname
            : "/" + segments.slice(0, idx + 1).join("/");
        const isLast = idx === segments.length - 1;

        return { seg, idx, isId, isLast, label, href };
    });

    return (
        <Breadcrumb>
            <BreadcrumbList>
                {crumbs.map((c) => (
                    <div key={`${c.idx}-${c.seg}`} className="contents">
                        <BreadcrumbItem>
                            {c.isLast && !c.isId ? (
                                <BreadcrumbPage>{c.label}</BreadcrumbPage>
                            ) : (
                                <BreadcrumbLink asChild>
                                    <Link
                                        href={c.href}
                                        title={c.isId ? c.seg : undefined}>
                                        {c.label}
                                    </Link>
                                </BreadcrumbLink>
                            )}
                        </BreadcrumbItem>
                        {!c.isLast ? <BreadcrumbSeparator /> : null}
                    </div>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
