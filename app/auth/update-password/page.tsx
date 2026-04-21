import { redirect, unstable_rethrow } from "next/navigation";

import { UpdatePasswordForm } from "@/app/auth/update-password/update-password-form";
import { createClient } from "@/lib/supabase/server";

export default async function UpdatePasswordPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const resolvedSearchParams = await searchParams;
    const code =
        typeof resolvedSearchParams.code === "string"
            ? resolvedSearchParams.code
            : undefined;

    if (code) {
        const forward = new URLSearchParams({
            code,
            next: "/auth/update-password",
        });
        redirect(`/auth/callback?${forward.toString()}`);
    }

    let systemError: string | undefined;

    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            redirect("/login");
        }
    } catch (error) {
        unstable_rethrow(error);
        systemError =
            error instanceof Error
                ? error.message
                : "Supabase auth is not configured for this environment.";
    }

    return (
        <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-16">
            <div className="space-y-3">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    Reset password
                </p>
                <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                    Choose a new password
                </h1>
                <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
                    Your account is verified. Enter and confirm a new password
                    to finish resetting it.
                </p>
            </div>
            {systemError ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {systemError}
                </p>
            ) : (
                <UpdatePasswordForm />
            )}
        </main>
    );
}
