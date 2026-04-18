"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createPayrolls } from "../actions";
import {
    payrollPeriodFormSchema,
    type PayrollPeriodFormValues,
} from "@/db/schemas/payroll-period";
import type { PayrollPeriodConflict } from "@/utils/payroll/payroll-period-conflicts";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { columns, type WorkerForPayrollSelection as Worker } from "./columns";
import { parseIsoToDateStrict } from "@/utils/time/calendar-date";
import { formatEnGbDmyNumeric } from "@/utils/time/intl-en-gb";

type FormValues = PayrollPeriodFormValues;

function toDisplayDate(date: string): string {
    const parsed = parseIsoToDateStrict(date);
    return parsed ? formatEnGbDmyNumeric(parsed) : date;
}

export function PayrollForm({ workers }: { workers: Worker[] }) {
    const router = useRouter();
    const [pending, setPending] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [summary, setSummary] = React.useState<{
        created: string;
        skipped: string;
    } | null>(null);
    const [conflicts, setConflicts] = React.useState<PayrollPeriodConflict[]>(
        [],
    );
    const [rowSelection, setRowSelection] = React.useState<
        Record<string, boolean>
    >({});

    const selectedWorkerIds = React.useMemo(() => {
        return Object.entries(rowSelection)
            .filter(([, selected]) => selected)
            .map(([id]) => id);
    }, [rowSelection]);

    const selectedCount = selectedWorkerIds.length;

    const form = useForm<FormValues>({
        resolver: zodResolver(payrollPeriodFormSchema),
        defaultValues: {
            periodStart: "",
            periodEnd: "",
            payrollDate: new Date().toISOString().slice(0, 10),
        },
    });

    async function onSubmit(values: FormValues) {
        setError(null);
        setSummary(null);
        setConflicts([]);
        setPending(true);

        const formData = new FormData();
        formData.set("periodStart", values.periodStart);
        formData.set("periodEnd", values.periodEnd);
        formData.set("payrollDate", values.payrollDate);
        selectedWorkerIds.forEach((id) => formData.append("workerId", id));

        const result = await createPayrolls(formData);
        setPending(false);
        if ("error" in result) {
            setError(result.error);
            return;
        }

        if (result.created > 0 && result.skipped === 0) {
            router.push("/dashboard/payroll/all");
            router.refresh();
            return;
        }

        const uniqueConflicts = Array.from(
            new Map(
                result.conflicts.map((conflict) => [
                    conflict.payrollId,
                    conflict,
                ]),
            ).values(),
        );

        const createdLabel = `${result.created} payroll${result.created === 1 ? "" : "s"} created`;
        const skippedLabel =
            result.skipped > 0
                ? `${result.skipped} worker${result.skipped === 1 ? "" : "s"} skipped due to overlap`
                : "no workers skipped";

        setSummary({
            created: createdLabel,
            skipped: skippedLabel,
        });
        setConflicts(uniqueConflicts);
        if (result.created > 0) {
            router.refresh();
        }
    }

    return (
        <Card className="mx-auto max-w-4xl">
            <CardHeader>
                <CardTitle>New payroll</CardTitle>
                <p className="text-muted-foreground text-sm">
                    Select workers and pay period. Hours and pay are computed
                    from timesheet entries.
                </p>
            </CardHeader>
            <CardContent>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                    autoComplete="off">
                    <FieldGroup>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Controller
                                name="periodStart"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="periodStart">
                                            Period start
                                        </FieldLabel>
                                        <DatePickerInput
                                            id="periodStart"
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            disabled={pending}
                                            aria-invalid={fieldState.invalid}
                                            required
                                        />
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />
                            <Controller
                                name="periodEnd"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="periodEnd">
                                            Period end
                                        </FieldLabel>
                                        <DatePickerInput
                                            id="periodEnd"
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            disabled={pending}
                                            aria-invalid={fieldState.invalid}
                                            required
                                        />
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />
                        </div>

                        <Controller
                            name="payrollDate"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="payrollDate">
                                        Payroll date
                                    </FieldLabel>
                                    <DatePickerInput
                                        id="payrollDate"
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        disabled={pending}
                                        aria-invalid={fieldState.invalid}
                                        required
                                        suppressHydrationWarning
                                    />
                                    {fieldState.invalid && (
                                        <FieldError
                                            errors={[fieldState.error]}
                                        />
                                    )}
                                </Field>
                            )}
                        />
                    </FieldGroup>

                    <div className="space-y-2 mt-8">
                        <DataTable
                            columns={columns}
                            searchParamKey="search"
                            data={workers}
                            enableRowSelection
                            rowSelection={rowSelection}
                            onRowSelectionChange={setRowSelection}
                            getRowId={(row) => row.id}
                            pageSize={20}
                        />
                        {selectedCount > 0 && (
                            <p className="text-muted-foreground text-sm">
                                {selectedCount} worker
                                {selectedCount !== 1 ? "s" : ""} selected
                            </p>
                        )}
                    </div>

                    {error && (
                        <p className="text-destructive text-sm">{error}</p>
                    )}
                    {summary && (
                        <div className="text-muted-foreground text-sm space-y-1">
                            <p>{summary.created}</p>
                            <p className="text-destructive">
                                {summary.skipped}
                            </p>
                        </div>
                    )}
                    {conflicts.length > 0 && (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Period start</TableHead>
                                        <TableHead>Period end</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">
                                            Action
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {conflicts.map((conflict) => (
                                        <TableRow key={conflict.payrollId}>
                                            <TableCell className="font-medium">
                                                {conflict.workerName}
                                            </TableCell>
                                            <TableCell>
                                                {toDisplayDate(
                                                    conflict.periodStart,
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {toDisplayDate(
                                                    conflict.periodEnd,
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {conflict.status}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    asChild
                                                    size="sm"
                                                    variant="outline">
                                                    <Link
                                                        href={`/dashboard/payroll/${conflict.payrollId}/breakdown`}>
                                                        View
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <Button
                            type="submit"
                            disabled={pending || selectedCount === 0}>
                            {pending ? "Generating..." : "Generate"}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.back()}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
