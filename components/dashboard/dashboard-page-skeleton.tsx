import { Skeleton } from "@/components/ui/skeleton";

/** Matches feature hub pages: quick actions card, one stat card, chart card. */
export function DashboardHubOverviewSkeleton({
    buttonSlots = 4,
}: {
    buttonSlots?: number;
}) {
    const n = Math.max(1, Math.min(6, Math.floor(buttonSlots)));
    return (
        <div className="space-y-6">
            <div className="bg-card flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
                <div className="px-6">
                    <Skeleton className="h-6 w-36" />
                </div>
                <div className="flex flex-wrap gap-2 px-6">
                    {Array.from({ length: n }).map((_, i) => (
                        <Skeleton
                            key={i}
                            className="h-9 w-40 max-w-[min(100%,10rem)]"
                        />
                    ))}
                </div>
            </div>
            <DashboardStatCardsSkeleton columns={3} count={1} />
            <DashboardSectionCardSkeleton />
        </div>
    );
}

/** Generic dashboard route fallback: title area + optional stat grid + content block. */
export function DashboardPageSkeleton() {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-8 w-48 max-w-[min(100%,12rem)]" />
                <Skeleton className="h-4 w-96 max-w-full" />
            </div>
            <DashboardStatCardsSkeleton columns={4} />
            <Skeleton className="h-48 w-full rounded-xl" />
        </div>
    );
}

export function DashboardStatCardsSkeleton({
    columns = 4,
    count = 4,
}: {
    columns?: 2 | 3 | 4;
    count?: number;
}) {
    const gridClass =
        columns === 4
            ? "md:grid-cols-2 lg:grid-cols-4"
            : columns === 3
              ? "md:grid-cols-2 lg:grid-cols-3"
              : "md:grid-cols-2";

    return (
        <div className={`grid gap-4 ${gridClass}`}>
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="space-y-3 rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-4 w-4 rounded" />
                    </div>
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-full max-w-48" />
                    <Skeleton className="h-4 w-24" />
                </div>
            ))}
        </div>
    );
}

/** Single large card with header + body (e.g. chart or breakdown). */
export function DashboardSectionCardSkeleton() {
    return (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
            <div className="space-y-1.5 border-b p-6">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-56 max-w-full" />
            </div>
            <div className="p-6">
                <Skeleton className="mx-auto h-48 w-48 rounded-full" />
            </div>
        </div>
    );
}
