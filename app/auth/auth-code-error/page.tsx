import Link from "next/link";

export default function AuthCodeErrorPage() {
    return (
        <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-16">
            <div className="space-y-3">
                <h1 className="text-2xl font-semibold tracking-tight">
                    Link invalid or expired
                </h1>
                <p className="text-muted-foreground">
                    This sign-in or password reset link could not be used. It
                    may have expired, or it was already used once.
                </p>
            </div>
            <p>
                <Link
                    href="/login"
                    className="font-medium text-primary underline underline-offset-4">
                    Back to sign in
                </Link>
            </p>
        </main>
    );
}
