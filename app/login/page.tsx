import { redirect, unstable_rethrow } from "next/navigation";

import { LoginForm } from "@/app/login/login-form";
import { sanitizeRedirectTo } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const resolvedSearchParams = await searchParams;
    const redirectTo = sanitizeRedirectTo(
        typeof resolvedSearchParams.redirectTo === "string"
            ? resolvedSearchParams.redirectTo
            : undefined,
    );
    const authError =
        typeof resolvedSearchParams.authError === "string"
            ? resolvedSearchParams.authError
            : undefined;
    let systemError: string | undefined;

    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (user?.email?.trim()) {
            redirect(redirectTo);
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
                    Sign in
                </p>
                <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                    Dashboard access requires sign-in
                </h1>
                <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
                    Sign in with your email and password. After sign-in you will
                    return to the protected page you originally requested.
                </p>
            </div>
            <LoginForm
                authError={authError}
                systemError={systemError}
                redirectTo={redirectTo}
            />
        </main>
    );
}
