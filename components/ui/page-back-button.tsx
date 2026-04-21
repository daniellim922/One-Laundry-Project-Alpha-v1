"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export function PageBackButton() {
    const router = useRouter();

    return (
        <Button
            variant="ghost"
            size="icon"
            className="h-auto w-9 cursor-pointer self-stretch hover:bg-card hover:text-card-foreground"
            onClick={() => router.back()}
            aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
        </Button>
    );
}

