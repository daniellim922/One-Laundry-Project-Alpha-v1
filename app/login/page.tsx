import Link from "next/link";

export default function LoginPage() {
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
                    The authentication flow is being wired in. Protected
                    dashboard routes now stop at this public login boundary
                    instead of rendering internal pages directly.
                </p>
            </div>
            <div className="flex flex-wrap gap-3">
                <Link
                    href="/"
                    className="inline-flex items-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90">
                    Return to landing page
                </Link>
                <Link
                    href="/dashboard"
                    className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
                    Retry protected route
                </Link>
            </div>
        </main>
    );
}
