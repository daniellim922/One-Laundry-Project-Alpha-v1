import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { ArrowRight, LayoutDashboard, Users, FileSpreadsheet, DollarSign, Shield } from "lucide-react";

export default function Page() {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mx-auto max-w-2xl space-y-6">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Welcome to the Dashboard
                </h1>
                <p className="text-muted-foreground text-lg">
                    Get started by exploring the main areas of your workspace.
                </p>
                <Button asChild size="lg" className="mt-4">
                    <Link href="/dashboard/home">
                        Go to Overview
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </div>

            <div className="mt-16 grid w-full max-w-3xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Link href="/dashboard/home">
                    <Card className="transition-colors hover:bg-muted/50">
                        <CardHeader className="pb-2">
                            <LayoutDashboard className="text-muted-foreground mb-2 h-8 w-8" />
                            <CardTitle>Overview</CardTitle>
                            <CardDescription>
                                View dashboard metrics and key stats
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </Link>
                <Link href="/dashboard/workers">
                    <Card className="transition-colors hover:bg-muted/50">
                        <CardHeader className="pb-2">
                            <Users className="text-muted-foreground mb-2 h-8 w-8" />
                            <CardTitle>Workers</CardTitle>
                            <CardDescription>
                                Manage your workforce
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </Link>
                <Link href="/dashboard/timesheet">
                    <Card className="transition-colors hover:bg-muted/50">
                        <CardHeader className="pb-2">
                            <FileSpreadsheet className="text-muted-foreground mb-2 h-8 w-8" />
                            <CardTitle>Timesheet</CardTitle>
                            <CardDescription>
                                Import and manage timesheets
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </Link>
                <Link href="/dashboard/expenses">
                    <Card className="transition-colors hover:bg-muted/50">
                        <CardHeader className="pb-2">
                            <DollarSign className="text-muted-foreground mb-2 h-8 w-8" />
                            <CardTitle>Expenses</CardTitle>
                            <CardDescription>
                                Track and manage expenses
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </Link>
                <Link href="/dashboard/iam">
                    <Card className="transition-colors hover:bg-muted/50">
                        <CardHeader className="pb-2">
                            <Shield className="text-muted-foreground mb-2 h-8 w-8" />
                            <CardTitle>IAM</CardTitle>
                            <CardDescription>
                                Identity and access management
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
