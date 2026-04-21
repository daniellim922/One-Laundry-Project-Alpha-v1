"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useActionState, useTransition } from "react";
import * as z from "zod";
import { useForm } from "react-hook-form";

import { updatePasswordAction } from "@/app/auth/actions";
import { initialUpdatePasswordActionState } from "@/app/auth/update-password-action-state";
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

const schema = z
    .object({
        password: z
            .string()
            .min(8, "Password must be at least 8 characters.")
            .max(72, "Password is too long."),
        confirmPassword: z.string().min(1, "Confirm your password."),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match.",
        path: ["confirmPassword"],
    });

type FormValues = z.infer<typeof schema>;

export function UpdatePasswordForm() {
    const [state, formAction] = useActionState(
        updatePasswordAction,
        initialUpdatePasswordActionState,
    );
    const [isPending, startTransition] = useTransition();

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });

    function onSubmit(values: FormValues) {
        startTransition(() => {
            const formData = new FormData();
            formData.set("password", values.password);
            formData.set("confirmPassword", values.confirmPassword);
            formAction(formData);
        });
    }

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4 rounded-2xl border p-6">
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem itemId="update-password-new">
                            <FormLabel>New password</FormLabel>
                            <FormControl>
                                <Input
                                    type="password"
                                    autoComplete="new-password"
                                    placeholder="At least 8 characters"
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
                    name="confirmPassword"
                    render={({ field }) => (
                        <FormItem itemId="update-password-confirm">
                            <FormLabel>Confirm password</FormLabel>
                            <FormControl>
                                <Input
                                    type="password"
                                    autoComplete="new-password"
                                    placeholder="Confirm password"
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
                    {isPending ? "Saving..." : "Update password"}
                </Button>
                {state.status === "error" && state.message ? (
                    <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {state.message}
                    </p>
                ) : null}
            </form>
        </Form>
    );
}
