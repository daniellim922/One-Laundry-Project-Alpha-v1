"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        // Form submission logic can be added here
        console.log("Login attempt:", { username, password });
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
                <form onSubmit={handleSubmit} className="space-y-6">
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
                        />
                    </div>
                    <Button type="submit" className="w-full" size="lg">
                        Log in
                    </Button>
                </form>
            </div>
        </div>
    );
}
