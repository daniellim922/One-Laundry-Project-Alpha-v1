"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { createTimesheetEntry } from "./actions";
import { SearchableWorkerSelect } from "@/components/searchable-worker-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Worker = { id: string; name: string };

export function TimesheetEntryForm({
    workers,
}: {
    workers: Worker[];
}) {
    const router = useRouter();
    const [pending, setPending] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [workerId, setWorkerId] = React.useState("");

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setPending(true);
        const form = e.currentTarget;
        const formData = new FormData(form);
        const result = await createTimesheetEntry(formData);
        setPending(false);
        if (result.error) {
            setError(result.error);
            return;
        }
        router.push("/dashboard/timesheet");
        router.refresh();
    }

    const today = new Date().toISOString().slice(0, 10);

    return (
        <Card>
            <CardHeader>
                <CardTitle>New entry</CardTitle>
                <p className="text-muted-foreground text-sm">
                    Worker name, date, and clock in/out times
                </p>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="workerId">Worker</Label>
                        <SearchableWorkerSelect
                            name="workerId"
                            workers={workers}
                            value={workerId}
                            onChange={(id) => setWorkerId(id)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Input
                            id="date"
                            name="date"
                            type="date"
                            defaultValue={today}
                            suppressHydrationWarning
                            required
                        />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="timeIn">Time in</Label>
                            <Input
                                id="timeIn"
                                name="timeIn"
                                type="time"
                                defaultValue="09:00"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="timeOut">Time out</Label>
                            <Input
                                id="timeOut"
                                name="timeOut"
                                type="time"
                                defaultValue="17:00"
                                required
                            />
                        </div>
                    </div>
                    {error && (
                        <p className="text-destructive text-sm">{error}</p>
                    )}
                    <div className="flex gap-2">
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
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
