"use client";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="en">
            <body className="p-6">
                <h2 className="text-lg font-semibold">Something went wrong</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    Please try again. If the problem persists, contact support.
                </p>
                <button
                    type="button"
                    className="mt-4 inline-flex h-9 items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground"
                    onClick={reset}>
                    Try again
                </button>
                <pre className="mt-4 max-w-full overflow-auto rounded-md border bg-muted p-3 text-xs text-muted-foreground">
                    {error.message}
                </pre>
            </body>
        </html>
    );
}

