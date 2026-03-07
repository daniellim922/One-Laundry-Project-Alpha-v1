"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { createPayroll } from "./actions";
import { SearchableWorkerSelect } from "@/components/searchable-worker-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Worker = { id: string; name: string };

export function PayrollForm({ workers }: { workers: Worker[] }) {
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
        const result = await createPayroll(formData);
        setPending(false);
        if (result.error) {
            setError(result.error);
            return;
        }
        router.push("/dashboard/payroll");
        router.refresh();
    }

    const today = new Date().toISOString().slice(0, 10);

    return (
        <Card>
            <CardHeader>
                <CardTitle>New payroll</CardTitle>
                <p className="text-muted-foreground text-sm">
                    Select worker and pay period. Hours and pay are computed from timesheet entries.
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
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="periodStart">Period start</Label>
                            <Input
                                id="periodStart"
                                name="periodStart"
                                type="date"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="periodEnd">Period end</Label>
                            <Input
                                id="periodEnd"
                                name="periodEnd"
                                type="date"
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="payrollDate">Payroll date</Label>
                        <Input
                            id="payrollDate"
                            name="payrollDate"
                            type="date"
                            defaultValue={today}
                            suppressHydrationWarning
                            required
                        />
                    </div>
                    {error && (
                        <p className="text-destructive text-sm">{error}</p>
                    )}
                    <div className="flex gap-2">
                        <Button type="submit" disabled={pending}>
                            {pending ? "Creating..." : "Create payroll"}
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
