import Link from "next/link";
import { count } from "drizzle-orm";

import { db } from "@/lib/db";
import { user } from "@/db/auth-schema";
import { rolesTable } from "@/db/tables/auth/rolesTable";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { SimpleDonutChart } from "@/components/dashboard/simple-donut-chart";
import { ArrowRight, Plus, Shield } from "lucide-react";

export default async function IamOverviewPage() {
    const [[{ userCount }], [{ roleCount }]] = await Promise.all([
        db.select({ userCount: count() }).from(user),
        db.select({ roleCount: count() }).from(rolesTable),
    ]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">IAM</h1>
                <p className="text-muted-foreground">
                    Identity and access overview
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Users
                        </CardTitle>
                        <Shield className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{userCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                            Roles
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{roleCount}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button asChild>
                    <Link href="/dashboard/iam/roles">
                        Users & Roles
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
                <Button variant="outline" asChild>
                    <Link href="/dashboard/iam/users/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Add user
                    </Link>
                </Button>
                <Button variant="outline" asChild>
                    <Link href="/dashboard/iam/roles/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Add role
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Access overview</CardTitle>
                    <CardDescription>Users vs roles (counts)</CardDescription>
                </CardHeader>
                <CardContent>
                    <SimpleDonutChart
                        centerLabel="total"
                        segments={[
                            {
                                key: "users",
                                label: "Users",
                                value: Number(userCount),
                            },
                            {
                                key: "roles",
                                label: "Roles",
                                value: Number(roleCount),
                            },
                        ]}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
