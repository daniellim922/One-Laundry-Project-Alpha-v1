"use client";

import * as React from "react";
import { createUser } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

type CreateUserFormProps = {
    roleId?: string;
};

export function CreateUserForm({ roleId }: CreateUserFormProps) {
    const [name, setName] = React.useState("");
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [username, setUsername] = React.useState("");
    const [error, setError] = React.useState<string | null>(null);
    const [isPending, setIsPending] = React.useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsPending(true);

        const result = await createUser({
            name,
            email,
            password,
            username: username || undefined,
            roleId,
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
                <CardTitle>New user</CardTitle>
                <CardDescription>
                    Enter the user details below.
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
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={isPending}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
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

                    {error ? (
                        <p className="text-destructive text-sm">{error}</p>
                    ) : null}

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="submit" disabled={isPending}>
                            {isPending ? "Creating..." : "Create user"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
