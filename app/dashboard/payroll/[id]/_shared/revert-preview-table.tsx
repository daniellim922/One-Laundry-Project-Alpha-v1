"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { RevertPreviewRow } from "@/services/payroll/get-revert-preview";
import { cn } from "@/lib/utils";
import {
    payrollStatusBadgeTone,
    timesheetPaymentStatusBadgeTone,
    installmentToneClassName,
    advanceLoanToneClassName,
} from "@/types/badge-tones";
import { formatEnGbDmyNumericFromCalendar } from "@/utils/time/intl-en-gb";
import { localTimeHm } from "@/utils/time/hm-time";

const statusToneMap: Record<string, string> = {
    ...payrollStatusBadgeTone,
    ...timesheetPaymentStatusBadgeTone,
    ...installmentToneClassName,
    ...advanceLoanToneClassName,
};

function StatusBadgePair({
    currentStatus,
    futureStatus,
}: {
    currentStatus: string;
    futureStatus: string;
}) {
    return (
        <>
            <TableCell>
                <Badge
                    variant="secondary"
                    className={cn(statusToneMap[currentStatus])}>
                    {currentStatus}
                </Badge>
            </TableCell>
            <TableCell>
                <Badge
                    variant="secondary"
                    className={cn(statusToneMap[futureStatus])}>
                    {futureStatus}
                </Badge>
            </TableCell>
        </>
    );
}

function revertPreviewRowIsExpandable(row: RevertPreviewRow): boolean {
    return (
        (row.timesheetLines?.length ?? 0) > 0 ||
        (row.advanceInstallmentLines?.length ?? 0) > 0
    );
}

function RevertPreviewExpandedLines({ row }: { row: RevertPreviewRow }) {
    if (row.timesheetLines?.length) {
        return (
            <Table className="text-sm">
                <TableHeader>
                    <TableRow>
                        <TableHead>Current Status</TableHead>
                        <TableHead>Future Status</TableHead>
                        <TableHead>Date in</TableHead>
                        <TableHead>Date out</TableHead>
                        <TableHead>Time in</TableHead>
                        <TableHead>Time out</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead className="text-right">View</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {row.timesheetLines.map((line) => (
                        <TableRow key={line.id}>
                            <StatusBadgePair
                                currentStatus={row.currentStatus}
                                futureStatus={row.futureStatus}
                            />
                            <TableCell>
                                {formatEnGbDmyNumericFromCalendar(line.dateIn)}
                            </TableCell>
                            <TableCell>
                                {formatEnGbDmyNumericFromCalendar(line.dateOut)}
                            </TableCell>
                            <TableCell>{localTimeHm(line.timeIn)}</TableCell>
                            <TableCell>{localTimeHm(line.timeOut)}</TableCell>
                            <TableCell>
                                {Number(line.hours).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    asChild>
                                    <Link
                                        href={`/dashboard/timesheet/${line.id}/view`}
                                        aria-label="View">
                                        <Eye className="size-4" aria-hidden />
                                    </Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    }

    if (row.advanceInstallmentLines?.length) {
        return (
            <Table className="text-sm">
                <TableHeader>
                    <TableRow>
                        <TableHead>Current Status</TableHead>
                        <TableHead>Future Status</TableHead>
                        <TableHead>Repayment date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead className="text-right">View</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {row.advanceInstallmentLines.map((line) => (
                        <TableRow key={line.id}>
                            <StatusBadgePair
                                currentStatus={row.currentStatus}
                                futureStatus={row.futureStatus}
                            />
                            <TableCell>
                                {line.repaymentDate
                                    ? formatEnGbDmyNumericFromCalendar(
                                          line.repaymentDate,
                                      )
                                    : "—"}
                            </TableCell>
                            <TableCell>{`$${line.amount}`}</TableCell>
                            <TableCell className="text-right">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    asChild>
                                    <Link
                                        href={`/dashboard/advance/${line.advanceRequestId}`}
                                        aria-label="View">
                                        <Eye className="size-4" aria-hidden />
                                    </Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    }

    return null;
}

export function RevertPreviewTable({ rows }: { rows: RevertPreviewRow[] }) {
    const [expandedRowNames, setExpandedRowNames] = React.useState<
        Record<string, boolean>
    >({});

    function toggleRowExpanded(name: string) {
        setExpandedRowNames((prev) => ({
            ...prev,
            [name]: !prev[name],
        }));
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Current Status</TableHead>
                    <TableHead>Future Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {rows.map((row) => {
                    if (revertPreviewRowIsExpandable(row)) {
                        const expanded = !!expandedRowNames[row.name];
                        return (
                            <React.Fragment key={row.name}>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        <button
                                            type="button"
                                            aria-expanded={expanded}
                                            onClick={() =>
                                                toggleRowExpanded(row.name)
                                            }
                                            className="flex cursor-pointer items-center gap-2 text-left underline-offset-4 hover:underline">
                                            <ChevronDown
                                                className={cn(
                                                    "size-4 shrink-0 transition-transform",
                                                    expanded && "rotate-180",
                                                )}
                                            />
                                            <span>{row.name}</span>
                                        </button>
                                    </TableCell>
                                    <StatusBadgePair
                                        currentStatus={row.currentStatus}
                                        futureStatus={row.futureStatus}
                                    />
                                </TableRow>
                                {expanded ? (
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell colSpan={3} className="p-0">
                                            <div className="max-h-96 overflow-y-auto border-t bg-muted/40 px-4 py-3">
                                                <RevertPreviewExpandedLines
                                                    row={row}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : null}
                            </React.Fragment>
                        );
                    }

                    return (
                        <TableRow key={row.name}>
                            <TableCell className="font-medium">
                                {row.name}
                            </TableCell>
                            <StatusBadgePair
                                currentStatus={row.currentStatus}
                                futureStatus={row.futureStatus}
                            />
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}
