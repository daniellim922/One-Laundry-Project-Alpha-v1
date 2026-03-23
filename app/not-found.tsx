"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
    const router = useRouter();

    const handleBack = () => {
        if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
        } else {
            router.push("/");
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
            <div className="text-center space-y-2">
                <h1 className="text-6xl font-bold">404</h1>
                <p className="text-muted-foreground text-lg">
                    This page could not be found.
                </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                    variant="outline"
                    size="lg"
                    onClick={handleBack}
                    className="inline-flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Go back
                </Button>
                <Button
                    size="lg"
                    onClick={() => router.push("/")}
                    className="inline-flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Go to home
                </Button>
            </div>
        </div>
    );
}
