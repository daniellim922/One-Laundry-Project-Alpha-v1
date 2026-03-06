"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { updateUser, unbanUser } from "./actions";
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
import type { user } from "@/db/auth-schema";

type EditUserFormProps = {
    user: typeof user.$inferSelect;
    roles: { id: string; name: string }[];
    currentRoleIds: string[];
};

export function EditUserForm({
    user,
    roles,
    currentRoleIds,
}: EditUserFormProps) {
    const router = useRouter();
    const [name, setName] = React.useState(user.name);
    const [username, setUsername] = React.useState(user.username ?? "");
    const [selectedRoleIds, setSelectedRoleIds] =
        React.useState<Set<string>>(new Set(currentRoleIds));
    const [error, setError] = React.useState<string | null>(null);
    const [isPending, setIsPending] = React.useState(false);
    const [isUnbanning, setIsUnbanning] = React.useState(false);

    const toggleRole = (roleId: string) => {
        setSelectedRoleIds((prev) => {
            const next = new Set(prev);
            if (next.has(roleId)) {
                next.delete(roleId);
            } else {
                next.add(roleId);
            }
            return next;
        });
    };

    const handleUnban = async () => {
        setError(null);
        setIsUnbanning(true);
        const result = await unbanUser(user.id);
        if (result.error) setError(result.error);
        else router.refresh();
        setIsUnbanning(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsPending(true);

        const result = await updateUser(user.id, {
            name,
            username: username || undefined,
            roleIds: Array.from(selectedRoleIds),
        });

        if (result.error) {
            setError(result.error);
            setIsPending(false);
            return;
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Edit user</CardTitle>
                <CardDescription>
                    Update name, username, and role assignments.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            disabled={isPending}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="username">Username (optional)</Label>
                        <Input
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={isPending}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <p className="text-muted-foreground text-sm">{user.email}</p>
                    </div>
                    {user.banned && (
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <div className="flex items-center gap-2">
                                <span className="text-destructive text-sm font-medium">
                                    Banned
                                    {user.banReason
                                        ? ` — ${user.banReason}`
                                        : ""}
                                </span>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleUnban}
                                    disabled={isUnbanning || isPending}>
                                    {isUnbanning ? "Unbanning..." : "Unban"}
                                </Button>
                            </div>
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label>Roles</Label>
                        <div className="flex flex-wrap gap-4">
                            {roles.map((r) => (
                                <label
                                    key={r.id}
                                    className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                        checked={selectedRoleIds.has(r.id)}
                                        onCheckedChange={() => toggleRole(r.id)}
                                        disabled={isPending}
                                    />
                                    {r.name}
                                </label>
                            ))}
                        </div>
                    </div>

                    {error ? (
                        <p className="text-destructive text-sm">{error}</p>
                    ) : null}

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="submit" disabled={isPending}>
                            {isPending ? "Saving..." : "Save changes"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
