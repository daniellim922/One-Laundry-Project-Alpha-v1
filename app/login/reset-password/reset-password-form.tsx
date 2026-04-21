"use client";

import { type FormEvent, useActionState, useEffect, useState, useTransition } from "react";

import Link from "next/link";

import { requestPasswordResetAction } from "@/app/auth/actions";
import { initialPasswordResetActionState } from "@/app/auth/password-reset-action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm({
    initialEmail,
    backToLoginHref,
}: {
    initialEmail: string;
    backToLoginHref: string;
}) {
    const [email, setEmail] = useState(initialEmail.trim());
    const [state, formAction] = useActionState(
        requestPasswordResetAction,
        initialPasswordResetActionState,
    );
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        setEmail(initialEmail.trim());
    }, [initialEmail]);

    function submitReset(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        startTransition(() => {
            const formData = new FormData();
            formData.set("email", email);
            formAction(formData);
        });
    }

    const successTone =
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";

    return (
        <form
            onSubmit={submitReset}
            className="space-y-4 rounded-2xl border p-6">
            <div className="space-y-2">
                <Label htmlFor="reset-password-email">Email</Label>
                <Input
                    id="reset-password-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isPending}
                    placeholder="you@company.com"
                />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-2">
                <Button
                    type="button"
                    variant="outline"
                    asChild
                    className="sm:w-auto">
                    <Link href={backToLoginHref}>Back to sign in</Link>
                </Button>
                <Button type="submit" disabled={isPending} className="sm:w-auto">
                    {isPending ? "Sending..." : "Send reset link"}
                </Button>
            </div>
            {state.status === "error" && state.message ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {state.message}
                </p>
            ) : null}
            {state.status === "success" && state.message ? (
                <p
                    className={`rounded-md border px-3 py-2 text-sm ${successTone}`}>
                    {state.message}
                </p>
            ) : null}
        </form>
    );
}
