"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

function LogoutButton() {
    const { pending } = useFormStatus();

    return (
        <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={pending}>
            {pending ? "Signing out..." : "Log out"}
        </Button>
    );
}

export function LogoutForm({ action }: { action: () => Promise<void> }) {
    return (
        <form action={action}>
            <LogoutButton />
        </form>
    );
}
