"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

type BackButtonProps = {
    /** When set, navigates here instead of browser history back. */
    href?: string;
};

export function BackButton({ href }: BackButtonProps) {
    const router = useRouter();
    const icon = <ArrowLeft className="h-4 w-4" />;

    if (href) {
        return (
            <Button variant="ghost" size="icon" asChild>
                <Link href={href} aria-label="Go back">
                    {icon}
                </Link>
            </Button>
        );
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            aria-label="Go back">
            {icon}
        </Button>
    );
}
