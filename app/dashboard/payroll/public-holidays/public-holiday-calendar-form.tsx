"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { savePublicHolidayYear } from "@/app/dashboard/payroll/public-holidays/actions";
import {
    PUBLIC_HOLIDAY_MAX_YEAR,
    PUBLIC_HOLIDAY_MIN_YEAR,
    publicHolidayYearInputSchema,
    type PublicHolidayYearInput,
} from "@/db/schemas/public-holiday";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type PublicHolidayCalendarFormProps = {
    year: number;
    holidays: Array<{
        id: string;
        date: string;
        name: string;
    }>;
};

type FormValues = PublicHolidayYearInput;

function createEmptyHolidayRow() {
    return {
        date: "",
        name: "",
    };
}

export function PublicHolidayCalendarForm({
    year,
    holidays,
}: PublicHolidayCalendarFormProps) {
    const router = useRouter();
    const [pending, setPending] = React.useState(false);
    const [saveError, setSaveError] = React.useState<string | null>(null);
    const [saveMessage, setSaveMessage] = React.useState<string | null>(null);
    const [yearInput, setYearInput] = React.useState(String(year));

    const form = useForm<FormValues>({
        resolver: zodResolver(publicHolidayYearInputSchema),
        defaultValues: {
            year,
            holidays:
                holidays.length > 0
                    ? holidays.map((holiday) => ({
                          date: holiday.date,
                          name: holiday.name,
                      }))
                    : [createEmptyHolidayRow()],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "holidays",
    });

    async function onSubmit(values: FormValues) {
        setPending(true);
        setSaveError(null);
        setSaveMessage(null);

        const result = await savePublicHolidayYear({
            year,
            holidays: values.holidays,
        });

        setPending(false);

        if ("error" in result) {
            setSaveError(result.error);
            return;
        }

        setSaveMessage(
            `Saved ${result.saved} holiday${result.saved === 1 ? "" : "s"} for ${year}.`,
        );
        router.refresh();
    }

    function handleLoadYear() {
        const parsed = Number(yearInput);
        if (
            !Number.isInteger(parsed) ||
            parsed < PUBLIC_HOLIDAY_MIN_YEAR ||
            parsed > PUBLIC_HOLIDAY_MAX_YEAR
        ) {
            setSaveError(
                `Year must be between ${PUBLIC_HOLIDAY_MIN_YEAR} and ${PUBLIC_HOLIDAY_MAX_YEAR}`,
            );
            setSaveMessage(null);
            return;
        }

        setSaveError(null);
        setSaveMessage(null);
        router.push(`/dashboard/payroll/public-holidays?year=${parsed}`);
        router.refresh();
    }

    return (
        <Card className="w-full">
            <CardHeader className="gap-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <CardTitle>Holiday calendar</CardTitle>
                        <CardDescription>
                            Load a calendar year, edit the row list, then save
                            the full year as one update.
                        </CardDescription>
                    </div>
                    <div className="flex items-end gap-2">
                        <Field className="min-w-40">
                            <FieldLabel htmlFor="public-holiday-year">
                                Calendar year
                            </FieldLabel>
                            <Input
                                id="public-holiday-year"
                                type="number"
                                inputMode="numeric"
                                min={PUBLIC_HOLIDAY_MIN_YEAR}
                                max={PUBLIC_HOLIDAY_MAX_YEAR}
                                value={yearInput}
                                onChange={(event) =>
                                    setYearInput(event.target.value)
                                }
                            />
                        </Field>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleLoadYear}>
                            Load year
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                    autoComplete="off">
                    <FieldGroup>
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-medium">
                                    {year} holiday rows
                                </p>
                                <p className="text-muted-foreground text-sm">
                                    Dates must belong to {year}, and each date
                                    can appear only once.
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => append(createEmptyHolidayRow())}>
                                Add holiday
                            </Button>
                        </div>

                        {fields.length === 0 ? (
                            <div className="rounded-md border border-dashed p-6 text-sm">
                                <p className="font-medium">
                                    No public holidays saved for {year} yet.
                                </p>
                                <p className="text-muted-foreground mt-1">
                                    Add the first row, then save this year&apos;s
                                    calendar.
                                </p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-48">
                                            Holiday date
                                        </TableHead>
                                        <TableHead>Holiday name</TableHead>
                                        <TableHead className="w-28 text-right">
                                            Action
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fields.map((field, index) => (
                                        <TableRow key={field.id}>
                                            <TableCell className="align-top">
                                                <Controller
                                                    name={`holidays.${index}.date`}
                                                    control={form.control}
                                                    render={({
                                                        field: dateField,
                                                        fieldState,
                                                    }) => (
                                                        <Field
                                                            data-invalid={
                                                                fieldState.invalid
                                                            }>
                                                            <FieldLabel
                                                                htmlFor={`holiday-date-${index}`}
                                                                className="sr-only">
                                                                Holiday date
                                                            </FieldLabel>
                                                            <DatePickerInput
                                                                id={`holiday-date-${index}`}
                                                                value={
                                                                    dateField.value
                                                                }
                                                                onValueChange={
                                                                    dateField.onChange
                                                                }
                                                                disabled={
                                                                    pending
                                                                }
                                                                aria-invalid={
                                                                    fieldState.invalid
                                                                }
                                                            />
                                                            {fieldState.invalid ? (
                                                                <FieldError
                                                                    errors={[
                                                                        fieldState.error,
                                                                    ]}
                                                                />
                                                            ) : null}
                                                        </Field>
                                                    )}
                                                />
                                            </TableCell>
                                            <TableCell className="align-top">
                                                <Controller
                                                    name={`holidays.${index}.name`}
                                                    control={form.control}
                                                    render={({
                                                        field: nameField,
                                                        fieldState,
                                                    }) => (
                                                        <Field
                                                            data-invalid={
                                                                fieldState.invalid
                                                            }>
                                                            <FieldLabel
                                                                htmlFor={`holiday-name-${index}`}
                                                                className="sr-only">
                                                                Holiday name
                                                            </FieldLabel>
                                                            <Input
                                                                id={`holiday-name-${index}`}
                                                                value={
                                                                    nameField.value
                                                                }
                                                                onChange={
                                                                    nameField.onChange
                                                                }
                                                                disabled={
                                                                    pending
                                                                }
                                                                placeholder="e.g. Labour Day"
                                                            />
                                                            {fieldState.invalid ? (
                                                                <FieldError
                                                                    errors={[
                                                                        fieldState.error,
                                                                    ]}
                                                                />
                                                            ) : null}
                                                        </Field>
                                                    )}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right align-top">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    onClick={() => remove(index)}
                                                    disabled={pending}
                                                    aria-label={`Remove holiday ${index + 1}`}>
                                                    Remove
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </FieldGroup>

                    {saveError ? (
                        <p className="text-destructive text-sm" role="alert">
                            {saveError}
                        </p>
                    ) : null}
                    {saveMessage ? (
                        <p className="text-sm text-emerald-700">{saveMessage}</p>
                    ) : null}

                    <div className="flex gap-2">
                        <Button type="submit" disabled={pending}>
                            {pending ? "Saving..." : "Save year"}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={pending}
                            onClick={() => append(createEmptyHolidayRow())}>
                            Add another row
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
