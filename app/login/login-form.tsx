"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useActionState, useTransition } from "react";
import * as z from "zod";

import { signInWithPasswordAction } from "@/app/login/actions";
import { initialLoginActionState } from "@/app/login/login-action-state";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";

const loginFormSchema = z.object({
    email: z.email("Enter a valid email address."),
    password: z.string().min(1, "Password is required."),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

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
        signInWithPasswordAction,
        initialLoginActionState,
    );
    const [isPending, startTransition] = useTransition();

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginFormSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    function onSubmit(values: LoginFormValues) {
        startTransition(() => {
            const formData = new FormData();
            formData.set("email", values.email);
            formData.set("password", values.password);
            formData.set("redirectTo", redirectTo);
            formAction(formData);
        });
    }

    const toneClassName =
        state.status === "error" || authError
            ? "border-destructive/30 bg-destructive/10 text-destructive"
            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4 rounded-2xl border p-6">
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem itemId="login-email">
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input
                                    type="email"
                                    autoComplete="email"
                                    placeholder="you@company.com"
                                    disabled={isPending}
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem itemId="login-password">
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                                <Input
                                    type="password"
                                    autoComplete="current-password"
                                    placeholder="Password"
                                    disabled={isPending}
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button
                    type="submit"
                    className="w-full sm:w-auto"
                    disabled={isPending}>
                    {isPending ? "Signing in..." : "Sign in"}
                </Button>
                {authError ? (
                    <p
                        className={`rounded-md border px-3 py-2 text-sm ${toneClassName}`}>
                        {authError === "callback"
                            ? "The sign-in session could not be completed. Try again."
                            : authError}
                    </p>
                ) : null}
                {systemError ? (
                    <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {systemError}
                    </p>
                ) : null}
                {state.status === "error" && state.message ? (
                    <p
                        className={`rounded-md border px-3 py-2 text-sm ${toneClassName}`}>
                        {state.message}
                    </p>
                ) : null}
            </form>
        </Form>
    );
}
