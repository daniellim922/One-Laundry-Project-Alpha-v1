"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createTimesheetEntry, updateTimesheetEntry } from "./actions";
import {
    timesheetEntryFormSchema,
    type TimesheetEntryFormValues,
} from "@/db/schemas/timesheet-entry";
import { SelectSearch } from "@/components/ui/SelectSearch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { clockIntervalDurationMs } from "@/utils/payroll/payroll-utils";
import type { TimesheetPaymentStatus } from "@/types/status";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { dateToLocalIsoYmd } from "@/utils/time/calendar-date";
import { TimesheetTimeField } from "./timesheet-time-field";
import { normalizeHmTime } from "./timesheet-time-utils";

type Worker = { id: string; name: string };

type TimesheetEntry = {
    id: string;
    workerId: string;
    dateIn: string;
    dateOut: string;
    timeIn: string;
    timeOut: string;
    status?: TimesheetPaymentStatus;
};

type FormValues = TimesheetEntryFormValues;

export function TimesheetEntryForm({
    workers,
    entry,
    disabled = false,
}: {
    workers: Worker[];
    entry?: TimesheetEntry;
    /** Read-only: same layout as edit, non-interactive fields */
    disabled?: boolean;
}) {
    const router = useRouter();
    const [pending, setPending] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const today = dateToLocalIsoYmd();
    const defaultDateIn = entry?.dateIn ?? today;
    const defaultDateOut = entry?.dateOut ?? defaultDateIn;
    const defaultTimeIn = normalizeHmTime(entry?.timeIn?.slice(0, 5) ?? "09:00");
    const defaultTimeOut = normalizeHmTime(
        entry?.timeOut?.slice(0, 5) ?? "17:00",
    );

    const form = useForm<FormValues>({
        resolver: zodResolver(timesheetEntryFormSchema),
        defaultValues: {
            workerId: entry?.workerId ?? "",
            dateIn: defaultDateIn,
            dateOut: defaultDateOut,
            timeIn: defaultTimeIn,
            timeOut: defaultTimeOut,
        },
    });

    const [dateIn, dateOut, timeIn, timeOut] = useWatch({
        control: form.control,
        name: ["dateIn", "dateOut", "timeIn", "timeOut"],
    });

    const totalHours = React.useMemo(() => {
        if (!dateIn || !dateOut || !timeIn || !timeOut) return null;
        const diffMs = clockIntervalDurationMs(
            dateIn,
            timeIn,
            dateOut,
            timeOut,
        );
        if (diffMs == null || diffMs < 0) return null;
        return (diffMs / 3_600_000).toFixed(2);
    }, [dateIn, dateOut, timeIn, timeOut]);

    async function onSubmit(values: FormValues) {
        setError(null);
        setPending(true);

        const formData = new FormData();
        formData.set("workerId", values.workerId);
        formData.set("dateIn", values.dateIn);
        formData.set("dateOut", values.dateOut);
        formData.set("timeIn", values.timeIn);
        formData.set("timeOut", values.timeOut);

        const result = entry
            ? await updateTimesheetEntry(entry.id, formData)
            : await createTimesheetEntry(formData);

        setPending(false);
        if ("error" in result) {
            setError(result.error);
            return;
        }

        router.push("/dashboard/timesheet/all");
        router.refresh();
    }

    const fieldsBody = (
        <>
            <FieldGroup>
                <Controller
                    name="workerId"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="workerId">Worker</FieldLabel>
                            <SelectSearch
                                id="workerId"
                                value={field.value}
                                options={workers.map((worker) => ({
                                    value: worker.id,
                                    label: worker.name,
                                }))}
                                onChange={(nextValue) => field.onChange(nextValue)}
                                required={!disabled}
                                disabled={disabled || pending}
                                aria-invalid={fieldState.invalid}
                                placeholder="Search or select worker…"
                                searchPlaceholder="Search workers…"
                                emptyText="No workers found."
                            />
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                    <Controller
                        name="dateIn"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor="dateIn">Date in</FieldLabel>
                                <DatePickerInput
                                    id="dateIn"
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    required={!disabled}
                                    disabled={disabled || pending}
                                    aria-invalid={fieldState.invalid}
                                />
                                {fieldState.invalid && (
                                    <FieldError errors={[fieldState.error]} />
                                )}
                            </Field>
                        )}
                    />

                    <Controller
                        name="dateOut"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor="dateOut">Date out</FieldLabel>
                                <DatePickerInput
                                    id="dateOut"
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    required={!disabled}
                                    disabled={disabled || pending}
                                    aria-invalid={fieldState.invalid}
                                />
                                {fieldState.invalid && (
                                    <FieldError errors={[fieldState.error]} />
                                )}
                            </Field>
                        )}
                    />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <Controller
                        name="timeIn"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor="timeIn">Time in</FieldLabel>
                                <TimesheetTimeField
                                    id="timeIn"
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    required={!disabled}
                                    disabled={disabled || pending}
                                    aria-invalid={fieldState.invalid}
                                />
                                {fieldState.invalid && (
                                    <FieldError errors={[fieldState.error]} />
                                )}
                            </Field>
                        )}
                    />

                    <Controller
                        name="timeOut"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor="timeOut">Time out</FieldLabel>
                                <TimesheetTimeField
                                    id="timeOut"
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    required={!disabled}
                                    disabled={disabled || pending}
                                    aria-invalid={fieldState.invalid}
                                />
                                {fieldState.invalid && (
                                    <FieldError errors={[fieldState.error]} />
                                )}
                            </Field>
                        )}
                    />
                </div>
            </FieldGroup>

            {totalHours !== null && (
                <div className="rounded-md bg-muted px-4 py-3 text-sm">
                    <span className="font-medium">Total hours:</span>{" "}
                    <span className="text-lg font-semibold">{totalHours}</span>
                </div>
            )}

            {!disabled && error && <p className="text-destructive text-sm">{error}</p>}

            <div className="flex gap-2">
                {disabled ? (
                    <>
                        <Button type="button" disabled>
                            Save
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.back()}>
                            Cancel
                        </Button>
                    </>
                ) : (
                    <>
                        <Button type="submit" disabled={pending}>
                            {pending ? (entry ? "Saving..." : "Adding...") : entry ? "Save" : "Add"}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.back()}>
                            Cancel
                        </Button>
                    </>
                )}
            </div>
        </>
    );

    return (
        <Card className="w-full">
            <CardContent>
                {disabled ? (
                    <div className="space-y-4">{fieldsBody}</div>
                ) : (
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4"
                        autoComplete="off">
                        {fieldsBody}
                    </form>
                )}
            </CardContent>
        </Card>
    );
}
