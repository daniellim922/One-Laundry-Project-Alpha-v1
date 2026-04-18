import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/app/login/login-form";
import { isAdminUser } from "@/lib/auth/admin";
import { sanitizeRedirectTo } from "@/lib/auth/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
        const supabase = await createSupabaseServerClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (isAdminUser(user)) {
            redirect(redirectTo);
        }
    } catch (error) {
        systemError =
            error instanceof Error
                ? error.message
                : "Supabase auth is not configured for this environment.";
    }

    return (
        <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-16">
            <div className="space-y-3">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    Admin Access
                </p>
                <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                    Dashboard access now requires sign-in
                </h1>
                <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
                    Request a Supabase magic link with the configured admin
                    email. After sign-in you will return to the protected page
                    you originally requested.
                </p>
            </div>
            <LoginForm
                authError={authError}
                systemError={systemError}
                redirectTo={redirectTo}
            />
            <div className="flex flex-wrap gap-3">
                <Link
                    href="/"
                    className="inline-flex items-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90">
                    Return to landing page
                </Link>
            </div>
        </main>
    );
}
