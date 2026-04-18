"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
    initialLoginActionState,
    requestMagicLinkAction,
} from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
            {pending ? "Sending link..." : "Email magic link"}
        </Button>
    );
}

export function LoginForm({
    authError,
    systemError,
    redirectTo,
}: {
    authError?: string;
    systemError?: string;
    redirectTo: string;
}) {
    const [state, formAction] = useActionState(
        requestMagicLinkAction,
        initialLoginActionState,
    );

    const toneClassName =
        state.status === "error" || authError
            ? "border-destructive/30 bg-destructive/10 text-destructive"
            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";

    return (
        <form action={formAction} className="space-y-4 rounded-2xl border p-6">
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <div className="space-y-2">
                <label
                    htmlFor="email"
                    className="text-sm font-medium text-foreground">
                    Admin email
                </label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="admin@example.com"
                    autoComplete="email"
                    required
                />
            </div>
            <SubmitButton />
            {authError ? (
                <p className={`rounded-md border px-3 py-2 text-sm ${toneClassName}`}>
                    {authError === "callback"
                        ? "The sign-in link could not be completed. Request a new one and try again."
                        : authError === "forbidden"
                          ? "That session is not allowed to access the dashboard."
                          : authError}
                </p>
            ) : null}
            {systemError ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {systemError}
                </p>
            ) : null}
            {state.status !== "idle" && state.message ? (
                <p className={`rounded-md border px-3 py-2 text-sm ${toneClassName}`}>
                    {state.message}
                </p>
            ) : null}
        </form>
    );
}
