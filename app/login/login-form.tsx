"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

type LoginFormProps = {
    /** Sanitized post-login path (under /dashboard). */
    afterLoginPath: string;
};

export function LoginForm({ afterLoginPath }: LoginFormProps) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);
        let didSucceed = false;

        try {
            await authClient.signIn.username(
                {
                    username,
                    password,
                    callbackURL: afterLoginPath,
                },
                {
                    onSuccess: () => {
                        didSucceed = true;
                        router.push(afterLoginPath);
                    },
                    onError: (ctx) => {
                        setError(ctx.error.message);
                    },
                },
            );
        } finally {
            if (!didSucceed) {
                setIsSubmitting(false);
            }
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 px-4">
            <div className="w-full max-w-sm space-y-8">
                <div>
                    <Link
                        href="/"
                        className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                        ← Back to home
                    </Link>
                    <h2 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-white">
                        Log in
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Enter your credentials to access your account.
                    </p>
                </div>
                <form
                    onSubmit={handleSubmit}
                    className="space-y-6"
                    aria-busy={isSubmitting}>
                    <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                            required
                            autoComplete="username"
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                            autoComplete="current-password"
                            disabled={isSubmitting}
                        />
                    </div>
                    {error ? (
                        <p className="text-sm text-red-600 dark:text-red-400">
                            {error}
                        </p>
                    ) : null}
                    <Button
                        type="submit"
                        className="w-full"
                        size="lg"
                        disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <span
                                    className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                                    aria-hidden="true"
                                />
                                Logging in…
                            </>
                        ) : (
                            "Log in"
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}
