"use client";

import * as React from "react";
import { createRoleWithPermissions, updateRolePermissions } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type CrudState = {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
};

type RoleFormProps = {
    features: { id: string; name: string }[];
    mode?: "create" | "edit";
    roleId?: string;
    initialName?: string;
    initialPermissions?: Record<
        string,
        { create: boolean; read: boolean; update: boolean; delete: boolean }
    >;
};

function initialPermissions(features: { id: string; name: string }[]): Record<string, CrudState> {
    const record: Record<string, CrudState> = {};
    for (const f of features) {
        record[f.id] = { create: false, read: false, update: false, delete: false };
    }
    return record;
}

export function RoleForm({
    features,
    mode = "create",
    roleId,
    initialName = "",
    initialPermissions: initialPermissionsProp,
}: RoleFormProps) {
    const isEdit = mode === "edit";
    const [name, setName] = React.useState(initialName);
    const [permissions, setPermissions] = React.useState<Record<string, CrudState>>(() =>
        isEdit && initialPermissionsProp
            ? { ...initialPermissionsProp }
            : initialPermissions(features),
    );
    const [error, setError] = React.useState<string | null>(null);
    const [isPending, setIsPending] = React.useState(false);

    const handleCrudChange = (
        featureId: string,
        key: keyof CrudState,
        checked: boolean,
    ) => {
        setPermissions((prev) => ({
            ...prev,
            [featureId]: { ...prev[featureId], [key]: checked },
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsPending(true);

        const payload = features.map((f) => {
            const p = permissions[f.id] ?? {
                create: false,
                read: false,
                update: false,
                delete: false,
            };
            return {
                featureId: f.id,
                create: p.create,
                read: p.read,
                update: p.update,
                delete: p.delete,
            };
        });

        const result = isEdit && roleId
            ? await updateRolePermissions(roleId, payload, name)
            : await createRoleWithPermissions(name, payload);

        if (result.error) {
            setError(result.error);
            setIsPending(false);
            return;
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{isEdit ? "Edit role permissions" : "Add new role"}</CardTitle>
                <CardDescription>
                    {isEdit
                        ? "Update the permissions for this role."
                        : "Enter a role name and select the permissions for each feature."}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
                    <div className="space-y-2">
                        <Label htmlFor="role-name">Role name</Label>
                        <Input
                            id="role-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Editor, Viewer"
                            required
                            disabled={isPending}
                        />
                    </div>

                    <div className="space-y-4">
                        <Label>Permissions</Label>
                        <div className="rounded-md border">
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
                                    {features.map((f) => {
                                        const p =
                                            permissions[f.id] ?? {
                                                create: false,
                                                read: false,
                                                update: false,
                                                delete: false,
                                            };
                                        return (
                                            <TableRow key={f.id}>
                                                <TableCell>{f.name}</TableCell>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={p.create}
                                                        onCheckedChange={(checked) =>
                                                            handleCrudChange(
                                                                f.id,
                                                                "create",
                                                                checked === true,
                                                            )
                                                        }
                                                        disabled={isPending}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={p.read}
                                                        onCheckedChange={(checked) =>
                                                            handleCrudChange(
                                                                f.id,
                                                                "read",
                                                                checked === true,
                                                            )
                                                        }
                                                        disabled={isPending}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={p.update}
                                                        onCheckedChange={(checked) =>
                                                            handleCrudChange(
                                                                f.id,
                                                                "update",
                                                                checked === true,
                                                            )
                                                        }
                                                        disabled={isPending}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={p.delete}
                                                        onCheckedChange={(checked) =>
                                                            handleCrudChange(
                                                                f.id,
                                                                "delete",
                                                                checked === true,
                                                            )
                                                        }
                                                        disabled={isPending}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {error ? (
                        <p className="text-destructive text-sm">{error}</p>
                    ) : null}

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="submit" disabled={isPending}>
                            {isPending
                                ? isEdit
                                    ? "Saving..."
                                    : "Creating..."
                                : isEdit
                                  ? "Save changes"
                                  : "Create role"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
