import Link from "next/link";

import type {
    GuidedMonthlyWorkflowSnapshot,
    GuidedMonthlyWorkflowStepStatus,
} from "@/services/payroll/guided-monthly-workflow";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

function statusLabel(status: GuidedMonthlyWorkflowStepStatus): string {
    if (status === "done") return "Done";
    if (status === "current") return "Current";
    return "Up next";
}

function statusClassName(status: GuidedMonthlyWorkflowStepStatus): string {
    if (status === "done") {
        return "border-emerald-200 bg-emerald-50 text-emerald-800";
    }
    if (status === "current") {
        return "border-primary/20 bg-primary/10 text-primary";
    }
    return "border-muted bg-muted/60 text-muted-foreground";
}

export function GuidedMonthlyWorkflowCard({
    snapshot,
}: {
    snapshot: GuidedMonthlyWorkflowSnapshot;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Guided monthly payroll workflow</CardTitle>
                <CardDescription>
                    Current business month: {snapshot.monthLabel}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {snapshot.steps.map((step, index) => (
                        <li key={step.id}>
                            <Link
                                href={step.href}
                                className={cn(
                                    "group flex h-full items-center gap-3 rounded-lg border px-3 py-3 transition-colors hover:bg-accent/50",
                                    step.status === "current" &&
                                        "border-primary/40 bg-primary/5",
                                )}>
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold">
                                    {index + 1}
                                </span>
                                <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
                                    {step.label}
                                </span>
                                <Badge
                                    variant="outline"
                                    className={statusClassName(step.status)}>
                                    {statusLabel(step.status)}
                                </Badge>
                            </Link>
                        </li>
                    ))}
                </ol>
            </CardContent>
        </Card>
    );
}
