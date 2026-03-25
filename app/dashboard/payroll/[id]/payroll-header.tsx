"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

import { updatePayroll } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PayrollHeaderProps {
    payroll: {
        id: string;
        periodStart: string;
        periodEnd: string;
        payrollDate: string;
        status: string;
    };
    workerName: string;
}

function formatDate(d: string | Date): string {
    const date = d instanceof Date ? d : new Date(d + "T00:00:00");
    return date.toLocaleDateString("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

export function PayrollHeader({ payroll, workerName }: PayrollHeaderProps) {
    const router = useRouter();
    const [editing, setEditing] = React.useState(false);
    const [pending, setPending] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const isDraft = payroll.status === "draft";

    const statusClass =
        payroll.status === "settled"
            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
            : "bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-300";

    async function handleSave(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setPending(true);

        const form = e.currentTarget;
        const formData = new FormData(form);
        const result = await updatePayroll(payroll.id, formData);

        setPending(false);
        if (result.error) {
            setError(result.error);
            return;
        }
        setEditing(false);
        router.refresh();
    }

    return (
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
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
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="space-y-1">
                                <Label htmlFor="periodStart" className="text-xs">
                                    Period start
                                </Label>
                                <Input
                                    id="periodStart"
                                    name="periodStart"
                                    type="date"
                                    defaultValue={payroll.periodStart}
                                    required
                                    className="h-8 w-auto"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="periodEnd" className="text-xs">
                                    Period end
                                </Label>
                                <Input
                                    id="periodEnd"
                                    name="periodEnd"
                                    type="date"
                                    defaultValue={payroll.periodEnd}
                                    required
                                    className="h-8 w-auto"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="payrollDate" className="text-xs">
                                    Payroll date
                                </Label>
                                <Input
                                    id="payrollDate"
                                    name="payrollDate"
                                    type="date"
                                    defaultValue={payroll.payrollDate}
                                    required
                                    className="h-8 w-auto"
                                />
                            </div>
                        </div>
                        {error && (
                            <p className="text-destructive text-sm">{error}</p>
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
                                }}
                                disabled={pending}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                ) : (
                    <p className="text-muted-foreground flex items-center gap-1">
                        Period: {formatDate(payroll.periodStart)} –{" "}
                        {formatDate(payroll.periodEnd)} | Payroll date:{" "}
                        {formatDate(payroll.payrollDate)}
                        {isDraft && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setEditing(true)}>
                                <Pencil className="h-3 w-3" />
                            </Button>
                        )}
                    </p>
                )}
            </div>
        </div>
    );
}
