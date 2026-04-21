import { ResetPasswordForm } from "@/app/login/reset-password/reset-password-form";
import { sanitizeRedirectTo } from "@/lib/auth/redirect";

export default async function ResetPasswordPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const resolvedSearchParams = await searchParams;
    const rawRedirectTo =
        typeof resolvedSearchParams.redirectTo === "string"
            ? resolvedSearchParams.redirectTo
            : undefined;
    const redirectTo = sanitizeRedirectTo(rawRedirectTo);
    const initialEmail =
        typeof resolvedSearchParams.email === "string"
            ? resolvedSearchParams.email
            : "";

    const backParams = new URLSearchParams();
    if (rawRedirectTo !== undefined) {
        backParams.set("redirectTo", redirectTo);
    }
    const backQuery = backParams.toString();
    const backToLoginHref = backQuery ? `/login?${backQuery}` : "/login";

    return (
        <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-16">
            <div className="space-y-3">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    Reset password
                </p>
                <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                    Forgot your password?
                </h1>
                <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
                    We will email you a link to choose a new password if an
                    account exists for that address.
                </p>
            </div>
            <ResetPasswordForm
                initialEmail={initialEmail}
                backToLoginHref={backToLoginHref}
            />
        </main>
    );
}
