"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { columns, type IAMUserRow } from "./columns";
import { DataTable } from "@/components/data-table/DataTable";
import { DataTableSkeleton } from "@/components/data-table-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export type RolePermission = {
    featureName: string;
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
};

type RolePermissionsCardProps = {
    roleId: string;
    roleName: string;
    permissions: RolePermission[];
    users: IAMUserRow[];
};

export function RolePermissionsCard({
    roleId,
    roleName,
    permissions,
    users,
}: RolePermissionsCardProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between gap-2">
                    <CardTitle>{roleName}</CardTitle>
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/iam/roles/edit/${roleId}`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                        </Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {permissions.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        No permissions assigned.
                    </p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Feature</TableHead>
                                <TableHead className="w-20">Create</TableHead>
                                <TableHead className="w-20">Read</TableHead>
                                <TableHead className="w-20">Update</TableHead>
                                <TableHead className="w-20">Delete</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {permissions.map((p) => (
                                <TableRow key={p.featureName}>
                                    <TableCell>{p.featureName}</TableCell>
                                    <TableCell>
                                        {p.create ? "✅" : "❌"}
                                    </TableCell>
                                    <TableCell>
                                        {p.read ? "✅" : "❌"}
                                    </TableCell>
                                    <TableCell>
                                        {p.update ? "✅" : "❌"}
                                    </TableCell>
                                    <TableCell>
                                        {p.delete ? "✅" : "❌"}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}

                <div className="mt-6">
                    <h3 className="mb-2 text-sm font-medium">
                        Users with this role
                    </h3>
                    <Suspense fallback={<DataTableSkeleton />}>
                        <DataTable
                            columns={columns}
                            data={users}
                            actions={
                                <Button size="sm" asChild>
                                    <Link
                                        href={`/dashboard/iam/users/new?roleId=${roleId}`}>
                                        <Plus className="mr-2 size-4" />
                                        Add user
                                    </Link>
                                </Button>
                            }
                        />
                    </Suspense>
                </div>
            </CardContent>
        </Card>
    );
}
