"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

import { updatePayroll } from "../actions";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Label } from "@/components/ui/label";
import { generateAndUploadPayrollPdf } from "@/lib/client/generate-and-upload-pdf";
import type { PayrollOverlapErrorResult } from "@/services/payroll/save-payroll";
import { payrollStatusBadgeTone } from "@/types/badge-tones";
import type { PayrollStatus } from "@/types/status";
import {
    formatEnGbDmyNumeric,
    formatEnGbDmyNumericFromCalendar,
} from "@/utils/time/intl-en-gb";

interface PayrollHeaderProps {
    payroll: {
        id: string;
        periodStart: string;
        periodEnd: string;
        payrollDate: string;
        status: PayrollStatus;
        updatedAt: string | Date;
    };
    workerName: string;
}

function formatLastUpdatedAt(value: string | Date): string {
    const d = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(d.getTime())) return "—";
    const dateStr = formatEnGbDmyNumeric(d);
    const timeStr = d.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
    return `${dateStr} ${timeStr}`;
}

function isPayrollOverlapErrorResult(
    result: unknown,
): result is PayrollOverlapErrorResult {
    return (
        !!result &&
        typeof result === "object" &&
        "code" in result &&
        result.code === "OVERLAP_CONFLICT" &&
        "conflicts" in result &&
        Array.isArray(result.conflicts)
    );
}

export function PayrollHeader({ payroll, workerName }: PayrollHeaderProps) {
    const router = useRouter();
    const [editing, setEditing] = React.useState(false);
    const [pending, setPending] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [conflictPayrollId, setConflictPayrollId] = React.useState<
        string | null
    >(null);
    const [pdfStatus, setPdfStatus] = React.useState<
        "idle" | "generating" | "done" | "failed"
    >("idle");
    const [periodStart, setPeriodStart] = React.useState(payroll.periodStart);
    const [periodEnd, setPeriodEnd] = React.useState(payroll.periodEnd);
    const [payrollDate, setPayrollDate] = React.useState(payroll.payrollDate);

    React.useEffect(() => {
        if (editing) return;
        setPeriodStart(payroll.periodStart);
        setPeriodEnd(payroll.periodEnd);
        setPayrollDate(payroll.payrollDate);
    }, [
        editing,
        payroll.periodStart,
        payroll.periodEnd,
        payroll.payrollDate,
    ]);

    const isDraft = payroll.status === "Draft";

    const statusClass = payrollStatusBadgeTone[payroll.status];

    async function handleSave(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setConflictPayrollId(null);
        setPending(true);

        const form = e.currentTarget;
        const formData = new FormData(form);
        const result = await updatePayroll(payroll.id, formData);

        setPending(false);
        if ("error" in result) {
            setError(result.error);
            if (isPayrollOverlapErrorResult(result)) {
                setConflictPayrollId(result.conflicts[0]?.payrollId ?? null);
            }
            return;
        }
        setEditing(false);
        router.refresh();

        setPdfStatus("generating");
        generateAndUploadPayrollPdf(payroll.id)
            .then(() => {
                setPdfStatus("done");
                setTimeout(() => setPdfStatus("idle"), 3000);
            })
            .catch(() => {
                setPdfStatus("failed");
                setTimeout(() => setPdfStatus("idle"), 5000);
            });
    }

    return (
        <div className="flex items-center gap-4">
            <Button
                variant="ghost"
                size="icon"
                className="h-auto w-9 self-stretch"
                asChild>
                <Link href="/dashboard/payroll/all">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <div className="flex-1 space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                    {workerName}
                    <span
                        className={`inline-flex rounded-full px-2 py-1 text-sm font-medium ${statusClass}`}>
                        {payroll.status}
                    </span>
                </h1>

                {editing ? (
                    <form onSubmit={handleSave} className="space-y-3 pt-1">
                        <input type="hidden" name="periodStart" value={periodStart} />
                        <input type="hidden" name="periodEnd" value={periodEnd} />
                        <input type="hidden" name="payrollDate" value={payrollDate} />
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="space-y-1">
                                <Label
                                    htmlFor="periodStart"
                                    className="text-md">
                                    Period start
                                </Label>
                                <DatePickerInput
                                    id="periodStart"
                                    value={periodStart}
                                    onValueChange={setPeriodStart}
                                    required
                                    disabled={pending}
                                    className="h-8 w-auto"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="periodEnd" className="text-md">
                                    Period end
                                </Label>
                                <DatePickerInput
                                    id="periodEnd"
                                    value={periodEnd}
                                    onValueChange={setPeriodEnd}
                                    required
                                    disabled={pending}
                                    className="h-8 w-auto"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label
                                    htmlFor="payrollDate"
                                    className="text-md">
                                    Payroll date
                                </Label>
                                <DatePickerInput
                                    id="payrollDate"
                                    value={payrollDate}
                                    onValueChange={setPayrollDate}
                                    required
                                    disabled={pending}
                                    className="h-8 w-auto"
                                />
                            </div>
                        </div>
                        {error && (
                            <div className="text-sm space-y-1">
                                <p className="text-destructive">{error}</p>
                                {conflictPayrollId && (
                                    <Link
                                        href={`/dashboard/payroll/${conflictPayrollId}/breakdown`}
                                        className="underline underline-offset-4">
                                        View conflicting payroll
                                    </Link>
                                )}
                            </div>
                        )}
                        <div className="flex gap-2">
                            <Button type="submit" size="sm" disabled={pending}>
                                {pending ? "Saving..." : "Save"}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setEditing(false);
                                    setError(null);
                                    setConflictPayrollId(null);
                                }}
                                disabled={pending}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                ) : (
                    <p className="text-muted-foreground flex flex-wrap items-center gap-1">
                        Period:{" "}
                        {formatEnGbDmyNumericFromCalendar(payroll.periodStart)} –{" "}
                        {formatEnGbDmyNumericFromCalendar(payroll.periodEnd)} |
                        Payroll date:{" "}
                        {formatEnGbDmyNumericFromCalendar(payroll.payrollDate)} |
                        Last updated: {formatLastUpdatedAt(payroll.updatedAt)}
                        {pdfStatus === "generating" && (
                            <span className="text-xs text-muted-foreground animate-pulse">
                                | Regenerating PDF…
                            </span>
                        )}
                        {pdfStatus === "done" && (
                            <span className="text-xs text-green-600">
                                | PDF updated
                            </span>
                        )}
                        {pdfStatus === "failed" && (
                            <span className="text-xs text-destructive">
                                | PDF regeneration failed
                            </span>
                        )}
                        {isDraft && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => {
                                    setPeriodStart(payroll.periodStart);
                                    setPeriodEnd(payroll.periodEnd);
                                    setPayrollDate(payroll.payrollDate);
                                    setEditing(true);
                                }}>
                                <Pencil className="h-3 w-3" />
                            </Button>
                        )}
                    </p>
                )}
            </div>
        </div>
    );
}
