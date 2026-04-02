import * as React from "react";

import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export type DataTableSkeletonProps = {
    columnCount?: number;
    rowCount?: number;
    showToolbar?: boolean;
};

export function DataTableSkeleton({
    columnCount = 6,
    rowCount = 10,
    showToolbar = true,
}: DataTableSkeletonProps) {
    const safeColumnCount = Math.max(1, Math.floor(columnCount));
    const safeRowCount = Math.max(1, Math.floor(rowCount));

    return (
        <div className="space-y-4">
            {showToolbar ? (
                <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-10 w-60 max-w-xs" />
                    <Skeleton className="h-10 w-32" />
                </div>
            ) : null}

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {Array.from({ length: safeColumnCount }).map(
                                (_, idx) => (
                                    <TableHead key={idx}>
                                        <Skeleton className="h-4 w-24" />
                                    </TableHead>
                                ),
                            )}
                        </TableRow>
                        <TableRow>
                            {Array.from({ length: safeColumnCount }).map(
                                (_, idx) => (
                                    <TableHead
                                        key={idx}
                                        className="px-2 py-1">
                                        <Skeleton className="h-8 w-full" />
                                    </TableHead>
                                ),
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({ length: safeRowCount }).map((_, rIdx) => (
                            <TableRow key={rIdx}>
                                {Array.from({
                                    length: safeColumnCount,
                                }).map((__, cIdx) => (
                                    <TableCell key={cIdx}>
                                        <Skeleton className="h-4 w-full" />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
