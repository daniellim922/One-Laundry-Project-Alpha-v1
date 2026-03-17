import type { ReactNode } from "react";

import { BackButton } from "@/components/back-button";

interface WorkerFormPageLayoutProps {
    title: string;
    description: string;
    children: ReactNode;
}

export function WorkerFormPageLayout({
    title,
    description,
    children,
}: WorkerFormPageLayoutProps) {
    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-start justify-center">
            <div className="w-full max-w-6xl space-y-6 py-8">
                <div className="flex items-center gap-3">
                    <BackButton />
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            {title}
                        </h1>
                        <p className="text-muted-foreground">{description}</p>
                    </div>
                </div>

                {children}
            </div>
        </div>
    );
}
