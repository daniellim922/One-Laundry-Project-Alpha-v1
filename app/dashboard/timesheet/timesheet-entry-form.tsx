"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { createTimesheetEntry, updateTimesheetEntry } from "./actions";
import { SearchableWorkerSelect } from "@/components/searchable-worker-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    formatTimesheetEntryStatus,
    timesheetEntryStatusPillClass,
    type TimesheetPaymentStatus,
} from "./timesheet-entry-status";

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
    const [workerId, setWorkerId] = React.useState(entry?.workerId ?? "");

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setPending(true);
        const form = e.currentTarget;
        const formData = new FormData(form);
        const result = entry
            ? await updateTimesheetEntry(entry.id, formData)
            : await createTimesheetEntry(formData);
        setPending(false);
        if (result.error) {
            setError(result.error);
            return;
        }
        router.push("/dashboard/timesheet/all");
        router.refresh();
    }

    const today = new Date().toISOString().slice(0, 10);
    const defaultDateIn = entry?.dateIn ?? today;
    const defaultDateOut = entry?.dateOut ?? defaultDateIn;
    const defaultTimeIn = entry?.timeIn?.slice(0, 5) ?? "09:00";
    const defaultTimeOut = entry?.timeOut?.slice(0, 5) ?? "17:00";

    const [dateIn, setDateIn] = React.useState(defaultDateIn);
    const [dateOut, setDateOut] = React.useState(defaultDateOut);
    const [timeIn, setTimeIn] = React.useState(defaultTimeIn);
    const [timeOut, setTimeOut] = React.useState(defaultTimeOut);

    const totalHours = React.useMemo(() => {
        if (!dateIn || !dateOut || !timeIn || !timeOut) return null;
        const start = new Date(`${dateIn}T${timeIn}:00`);
        const end = new Date(`${dateOut}T${timeOut}:00`);
        const diffMs = end.getTime() - start.getTime();
        if (diffMs < 0 || isNaN(diffMs)) return null;
        return (diffMs / 3_600_000).toFixed(2);
    }, [dateIn, dateOut, timeIn, timeOut]);

    const fieldsBody = (
        <>
            {entry?.status != null && (
                <div>
                    <span
                        className={timesheetEntryStatusPillClass(entry.status)}
                    >
                        {formatTimesheetEntryStatus(entry.status)}
                    </span>
                </div>
            )}
            <div className="space-y-2">
                <Label htmlFor="workerId">Worker</Label>
                <SearchableWorkerSelect
                    name="workerId"
                    workers={workers}
                    value={workerId}
                    onChange={(id) => setWorkerId(id)}
                    required={!disabled}
                    disabled={disabled}
                />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="dateIn">Date in</Label>
                    <Input
                        id="dateIn"
                        name="dateIn"
                        type="date"
                        value={dateIn}
                        onChange={(e) => setDateIn(e.target.value)}
                        required={!disabled}
                        disabled={disabled}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="dateOut">Date out</Label>
                    <Input
                        id="dateOut"
                        name="dateOut"
                        type="date"
                        value={dateOut}
                        onChange={(e) => setDateOut(e.target.value)}
                        required={!disabled}
                        disabled={disabled}
                    />
                </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="timeIn">Time in</Label>
                    <Input
                        id="timeIn"
                        name="timeIn"
                        type="time"
                        value={timeIn}
                        onChange={(e) => setTimeIn(e.target.value)}
                        required={!disabled}
                        disabled={disabled}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="timeOut">Time out</Label>
                    <Input
                        id="timeOut"
                        name="timeOut"
                        type="time"
                        value={timeOut}
                        onChange={(e) => setTimeOut(e.target.value)}
                        required={!disabled}
                        disabled={disabled}
                    />
                </div>
            </div>
            {totalHours !== null && (
                <div className="rounded-md bg-muted px-4 py-3 text-sm">
                    <span className="font-medium">Total hours:</span>{" "}
                    <span className="text-lg font-semibold">{totalHours}</span>
                </div>
            )}
            {!disabled && error && (
                <p className="text-destructive text-sm">{error}</p>
            )}
            <div className="flex gap-2">
                {disabled ? (
                    <>
                        <Button type="button" disabled>
                            Save
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.back()}
                        >
                            Cancel
                        </Button>
                    </>
                ) : (
                    <>
                        <Button type="submit" disabled={pending}>
                            {pending ? "Saving..." : "Save"}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.back()}
                        >
                            Cancel
                        </Button>
                    </>
                )}
            </div>
        </>
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    {disabled
                        ? "View entry"
                        : entry
                          ? "Edit entry"
                          : "New entry"}
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                    Worker name, date in/out, and clock in/out times
                </p>
            </CardHeader>
            <CardContent>
                {disabled ? (
                    <div className="space-y-4">{fieldsBody}</div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {fieldsBody}
                    </form>
                )}
            </CardContent>
        </Card>
    );
}
